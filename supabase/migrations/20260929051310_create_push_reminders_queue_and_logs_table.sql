begin;

-- Create push_reminders pgmq queue if not exists
do $$
begin
  if not exists (select 1 from pgmq.meta where queue_name = 'push_reminders') then
    perform pgmq.create('push_reminders');
  end if;
exception when others then
  null;
end $$;

-- Create push reminder logs table to track processed Sunday dates and guarantee idempotency
create table if not exists public.push_reminder_logs (
  id uuid primary key default gen_random_uuid(),
  sunday_date date not null unique,
  processed_at timestamptz not null default now()
);

alter table public.push_reminder_logs enable row level security;

drop policy if exists "allow service_role all" on public.push_reminder_logs;

create policy "allow service_role all" on public.push_reminder_logs for all to service_role using (true)
with
  check (true);

grant all on public.push_reminder_logs to service_role;

commit;
