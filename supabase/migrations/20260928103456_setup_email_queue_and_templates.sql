begin;

-- Enable necessary extensions
create extension if not exists pgmq cascade;

create extension if not exists pg_net cascade;

create extension if not exists pg_cron cascade;

-- Create pgmq queue if not exists
do $$
begin
  if not exists (select 1 from pgmq.meta where queue_name = 'email_notifications') then
    perform pgmq.create('email_notifications');
  end if;
exception when others then
  null;
end $$;

-- Create email_templates table
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  resend_template_id text not null,
  required_variables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for email_templates
alter table public.email_templates enable row level security;

drop policy if exists "Allow read access to authenticated admins for email templates" on public.email_templates;

create policy "Allow read access to authenticated admins for email templates" on public.email_templates for
select
  to authenticated using (public.is_admin ());

drop policy if exists "Allow write access to authenticated admins for email templates" on public.email_templates;

create policy "Allow write access to authenticated admins for email templates" on public.email_templates for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

grant
select
,
  insert,
update,
delete on public.email_templates to authenticated;

grant all on public.email_templates to service_role;

-- Helper function to trigger edge function
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

-- Schedule pg_cron sweeper job to run every 15 minutes
do $$
begin
  perform cron.unschedule('process_email_queue_15m');
exception when others then
  null;
end $$;

select
  cron.schedule (
    'process_email_queue_15m',
    '*/15 * * * *',
    $$
    select net.http_post(
        url := current_setting('app.settings.project_url', true) || '/functions/v1/process-email-queue',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
    );
    $$
  );

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
