begin;

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
    return query
    select
      queue_message.msg_id,
      queue_message.read_ct,
      queue_message.enqueued_at,
      queue_message.vt,
      queue_message.message
    from pgmq.read('email_notifications', 30, batch_size) as queue_message;
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

commit;
