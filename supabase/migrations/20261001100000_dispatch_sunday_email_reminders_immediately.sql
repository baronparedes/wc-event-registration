begin;

create or replace function public.generate_and_dispatch_upcoming_sunday_email_reminders () returns integer language plpgsql security definer
set
  search_path = public as $$
declare
  v_enqueued integer;
begin
  v_enqueued := public.generate_upcoming_sunday_email_reminders();

  if v_enqueued > 0 then
    perform public.trigger_email_processor();
  end if;

  return v_enqueued;
end;
$$;

revoke
execute on function public.generate_and_dispatch_upcoming_sunday_email_reminders ()
from
  public,
  anon,
  authenticated;

grant
execute on function public.generate_and_dispatch_upcoming_sunday_email_reminders () to service_role;

do $$
begin
  perform cron.unschedule('generate_upcoming_sunday_email_reminders_friday');
exception when others then
  null;
end $$;

select
  cron.schedule (
    'generate_upcoming_sunday_email_reminders_friday',
    '0 22 * * 4',
    $$
  select public.generate_and_dispatch_upcoming_sunday_email_reminders();
  $$
  );

commit;
