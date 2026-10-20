begin;

-- Monday 08:00 Asia/Manila (UTC+8) == Monday 00:00 UTC
do $$
begin
  perform cron.unschedule('weekly_sunday_debrief_monday_morning');
exception when others then
  null;
end $$;

select
  cron.schedule (
    'weekly_sunday_debrief_monday_morning',
    '0 0 * * 1',
    $$
    select net.http_post(
      url := coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1),
        current_setting('app.settings.project_url', true)
      ) || '/functions/v1/cron-weekly-sunday-debrief',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Key', coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'cron_role_key' limit 1),
          current_setting('app.settings.cron_role_key', true)
        )
      )
    );
    $$
  );

commit;
