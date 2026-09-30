begin;

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
      url := coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1),
        current_setting('app.settings.project_url', true)
      ) || '/functions/v1/cron-process-email-queue',
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

do $$
begin
  perform cron.unschedule('process_push_reminders_15m');
exception when others then
  null;
end $$;

select
  cron.schedule (
    'process_push_reminders_15m',
    '*/15 * * * *',
    $$
    select net.http_post(
      url := coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1),
        current_setting('app.settings.project_url', true)
      ) || '/functions/v1/cron-process-push-reminders',
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
