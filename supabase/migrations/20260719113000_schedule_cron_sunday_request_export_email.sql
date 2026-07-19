begin;

    create extension
    if not exists pg_net
    with schema extensions;
    create extension
    if not exists pg_cron
    with schema extensions;

do $$
declare
  job_name constant text := 'cron_upcoming_sunday_excused_export_email_sat_6am_pht';
  -- Saturday 06:00 Asia/Manila (UTC+8) == Friday 22:00 UTC
  schedule_utc constant text := '0 22 * * 5';
  project_url text := nullif
(current_setting
('app.settings.supabase_url', true), '');
  service_role_key text := nullif
(current_setting
('app.settings.service_role_key', true), '');
  function_url text;
begin
    if project_url is null then
    raise exception 'app.settings.supabase_url is not configured';
end
if;

    if service_role_key is null then
    raise exception 'app.settings.service_role_key is not configured';
end
if;

  function_url := project_url || '/functions/v1/cron_upcoming_sunday_excused_export_email';

if exists (select 1
from cron.job
where jobname = job_name) then
    perform cron.unschedule
(job_name);
end
if;

  perform cron.schedule
(
    job_name,
    schedule_utc,
    format
(
      $cmd$
select net.http_post(
        url
:= %L,
        headers := jsonb_build_object
(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L
        ),
        body := '{}'::jsonb
      );
      $cmd$,
      function_url,
      service_role_key
    )
  );
end;
$$;

commit;
