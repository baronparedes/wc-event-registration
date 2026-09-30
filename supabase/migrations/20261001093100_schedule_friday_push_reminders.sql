begin;

-- Friday 06:00 Asia/Manila (UTC+8) == Thursday 22:00 UTC
do $$
begin
  perform cron.unschedule('generate_upcoming_sunday_push_reminders_friday');
exception when others then
  null;
end $$;

select
  cron.schedule (
    'generate_upcoming_sunday_push_reminders_friday',
    '0 22 * * 4',
    $$
  select public.generate_upcoming_sunday_push_reminders();
  $$
  );

commit;
