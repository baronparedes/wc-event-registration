begin;

-- Friday 06:00 Asia/Manila (UTC+8) == Thursday 22:00 UTC
do $$
begin
  perform cron.unschedule('upcoming_sunday_excused_export_email_friday');
exception when others then
  null;
end $$;

select
  cron.schedule (
    'upcoming_sunday_excused_export_email_friday',
    '0 22 * * 4',
    $$
    select net.http_post(
      url := coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1),
        current_setting('app.settings.project_url', true)
      ) || '/functions/v1/cron-upcoming-sunday-excused-export-email',
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
