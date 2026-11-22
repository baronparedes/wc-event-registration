-- Schedule daily Google Sheet member sync at 02:00 AM Asia/Manila (18:00 UTC)
begin;

do $$
begin
  perform cron.unschedule('sync_members_google_sheet_daily');
exception when others then
  null;
end $$;

select
  cron.schedule (
    'sync_members_google_sheet_daily',
    '0 18 * * *',
    $$
    select net.http_post(
      url := coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1),
        current_setting('app.settings.project_url', true)
      ) || '/functions/v1/cron-sync-members-sheet',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Key', coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'cron_role_key' limit 1),
          current_setting('app.settings.cron_role_key', true)
        )
      ),
      body := '{}'::jsonb
    );
    $$
  );

commit;
