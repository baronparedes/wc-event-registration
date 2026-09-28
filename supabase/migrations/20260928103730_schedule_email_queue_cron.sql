begin;

-- Schedule pg_cron sweeper job to run every 15 minutes
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
        url := current_setting('app.settings.project_url', true) || '/functions/v1/process-email-queue',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
    );
    $$
  );

commit;
