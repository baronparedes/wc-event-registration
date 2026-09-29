begin;

-- 1. Update trigger_email_processor to use cron_role_key via X-Cron-Key
create or replace function public.trigger_email_processor () returns void language plpgsql security definer
set
  search_path = public as $$
declare
    project_url text;
    cron_key text;
begin
    begin
        select decrypted_secret into project_url from vault.decrypted_secrets where name = 'project_url' limit 1;
    exception when others then
        project_url := null;
    end;

    if project_url is null then
        begin
            project_url := current_setting('app.settings.project_url', true);
        exception when others then
            project_url := null;
        end;
    end if;

    begin
        select decrypted_secret into cron_key from vault.decrypted_secrets where name = 'cron_role_key' limit 1;
    exception when others then
        cron_key := null;
    end;

    if cron_key is null then
        begin
            cron_key := current_setting('app.settings.cron_role_key', true);
        exception when others then
            cron_key := null;
        end;
    end if;

    if project_url is not null and cron_key is not null then
        perform net.http_post(
            url := project_url || '/functions/v1/cron-process-email-queue',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'X-Cron-Key', cron_key
            )
        );
    end if;
end;
$$;

revoke
execute on function public.trigger_email_processor ()
from
  public,
  anon,
  authenticated;

grant
execute on function public.trigger_email_processor () to authenticated,
service_role;

-- 2. Reschedule process_email_queue_15m cron job with X-Cron-Key
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

commit;
