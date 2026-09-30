begin;

create or replace function public.trigger_push_reminder_processor () returns void language plpgsql security definer
set
  search_path = public as $$
declare
  project_url text;
  cron_key text;
begin
  begin
    select decrypted_secret into project_url
    from vault.decrypted_secrets
    where name = 'project_url'
    limit 1;
  exception when others then
    project_url := null;
  end;

  if project_url is null then
    project_url := current_setting('app.settings.project_url', true);
  end if;

  begin
    select decrypted_secret into cron_key
    from vault.decrypted_secrets
    where name = 'cron_role_key'
    limit 1;
  exception when others then
    cron_key := null;
  end;

  if cron_key is null then
    cron_key := current_setting('app.settings.cron_role_key', true);
  end if;

  if project_url is not null and cron_key is not null then
    perform net.http_post(
      url := project_url || '/functions/v1/cron-process-push-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Key', cron_key
      )
    );
  end if;
end;
$$;

revoke
execute on function public.trigger_push_reminder_processor ()
from
  public,
  anon,
  authenticated;

grant
execute on function public.trigger_push_reminder_processor () to service_role;

create or replace function public.generate_and_dispatch_upcoming_sunday_push_reminders () returns void language plpgsql security definer
set
  search_path = public as $$
begin
  perform public.generate_upcoming_sunday_push_reminders();
  perform public.trigger_push_reminder_processor();
end;
$$;

revoke
execute on function public.generate_and_dispatch_upcoming_sunday_push_reminders ()
from
  public,
  anon,
  authenticated;

grant
execute on function public.generate_and_dispatch_upcoming_sunday_push_reminders () to service_role;

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
  select public.generate_and_dispatch_upcoming_sunday_push_reminders();
  $$
  );

commit;
