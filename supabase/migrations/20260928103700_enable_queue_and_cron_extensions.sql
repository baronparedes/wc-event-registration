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

commit;
