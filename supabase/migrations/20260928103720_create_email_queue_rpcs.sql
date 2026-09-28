begin;

-- Helper function to trigger edge function via pg_net
create or replace function public.trigger_email_processor () returns void language plpgsql security definer
set
  search_path = public as $$
declare
    project_url text;
begin
    begin
        project_url := current_setting('app.settings.project_url', true);
    exception when others then
        project_url := null;
    end;

    if project_url is not null then
        perform net.http_post(
            url := project_url || '/functions/v1/process-email-queue',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            )
        );
    end if;
end;
$$;

revoke
execute on function public.trigger_email_processor ()
from
  public,
  anon,
  authenticated;

grant
execute on function public.trigger_email_processor () to authenticated,
service_role;

-- Wrapper function to enqueue messages securely via postgrest
create or replace function public.enqueue_email_notification (payload jsonb) returns bigint language plpgsql security definer
set
  search_path = public,
  pgmq as $$
declare
    msg_id bigint;
begin
    select pgmq.send('email_notifications', payload) into msg_id;
    return msg_id;
end;
$$;

revoke
execute on function public.enqueue_email_notification (jsonb)
from
  public,
  anon,
  authenticated;

grant
execute on function public.enqueue_email_notification (jsonb) to authenticated,
service_role;

-- Wrapper function to read and lock messages for processing
create or replace function public.pop_email_notifications (batch_size int default 10) returns table (
  msg_id bigint,
  read_ct int,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb
) language plpgsql security definer
set
  search_path = public,
  pgmq as $$
begin
    return query select * from pgmq.read('email_notifications', 30, batch_size);
end;
$$;

revoke
execute on function public.pop_email_notifications (int)
from
  public,
  anon,
  authenticated;

grant
execute on function public.pop_email_notifications (int) to service_role;

-- Wrapper function to acknowledge and delete a message
create or replace function public.archive_email_notification (message_id bigint) returns boolean language plpgsql security definer
set
  search_path = public,
  pgmq as $$
declare
    archived boolean;
begin
    select pgmq.archive('email_notifications', message_id) into archived;
    return archived;
end;
$$;

revoke
execute on function public.archive_email_notification (bigint)
from
  public,
  anon,
  authenticated;

grant
execute on function public.archive_email_notification (bigint) to service_role;

commit;
