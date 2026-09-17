-- 1. Enable required extensions
create extension if not exists pgmq cascade;

create extension if not exists pg_net cascade;

-- 2. Create the queue using pgmq
select
  pgmq.create ('background_jobs');

-- 2.5 Create RPC wrappers for Edge Functions to access pgmq from the public schema
create or replace function public.read_background_job (p_vt integer default 30, p_qty integer default 1) returns table (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamp with time zone,
  vt timestamp with time zone,
  message jsonb
) language sql security definer as $$
  select msg_id, read_ct, enqueued_at, vt, message
  from pgmq.read('background_jobs', p_vt, p_qty);
$$;

create or replace function public.delete_background_job (p_msg_id bigint) returns boolean language sql security definer as $$
  select pgmq.delete('background_jobs', p_msg_id);
$$;

create or replace function public.archive_background_job (p_msg_id bigint) returns boolean language sql security definer as $$
  select pgmq.archive('background_jobs', p_msg_id);
$$;

-- Secure the RPC wrappers to prevent public/anon execution via PostgREST
revoke
execute on function public.read_background_job (integer, integer)
from
  public,
  anon,
  authenticated;

grant
execute on function public.read_background_job (integer, integer) to service_role;

revoke
execute on function public.delete_background_job (bigint)
from
  public,
  anon,
  authenticated;

grant
execute on function public.delete_background_job (bigint) to service_role;

revoke
execute on function public.archive_background_job (bigint)
from
  public,
  anon,
  authenticated;

grant
execute on function public.archive_background_job (bigint) to service_role;

-- 3. Create the webhook trigger function
create or replace function public.trigger_process_background_job () returns trigger language plpgsql security definer as $$
declare
  v_url text;
  v_secret text;
begin
  -- Get the project URL and secret from vault or use a fixed host relative URL if possible.
  -- In Supabase edge functions triggered via pg_net from the same project,
  -- we often hit the internal URL or the public URL using anon key.
  -- To be robust across environments (local/prod), we read them from secrets or settings.

  -- Assuming the Edge Function URL is formed by a known pattern.
  -- Actually, we can use pg_net to call a relative URL if we configure the endpoint,
  -- but generally we pass the full URL.
  -- Since we need this to be environment-agnostic, a common practice is to use the
  -- Supabase API URL provided in the environment.
  -- But since this is a trigger, we can configure a base URL in a custom setting or vault.
  -- Alternatively, for simplicity, we can let the worker just be a cron, but we agreed on a webhook.

  -- Since we need the full URL and anon/service key to hit the Edge Function,
  -- and getting these dynamically in a trigger without Vault is tricky,
  -- we will assume the environment sets these in `current_setting`.
  -- We'll try reading from a custom setting, fallback to localhost for local testing.

  -- Use a relative internal URL for edge functions deployed on Supabase.
  -- The pg_net extension can route to functions relative to the local API gateway
  -- or we can use the environment variables automatically injected by Supabase (if available).
  -- Note: Supabase injects an internal URL `http://127.0.0.1:54321/functions/v1` locally,
  -- and `https://<project-ref>.supabase.co/functions/v1` in prod.
  -- Since pg_net executes inside the database, hitting the public internet URL works universally
  -- if we fetch the API URL from Vault. But since we don't have Vault setup, we can use the standard
  -- fallback pattern: read from custom setting, and if missing, it means we need to manually configure it.

  -- However, since the edge function now allows anonymous triggers (webhook without auth),
  -- we don't need the service_role_key to call the Edge Function. We only need the URL.
  -- In Supabase, standard convention for triggering edge functions from postgres without vault
  -- is calling a generic internal URL or configuring it.
  -- Let's use the standard internal URL for hosted Supabase:
  -- We'll try to read a custom setting `app.settings.edge_function_url` which the user can set via:
  -- ALTER DATABASE postgres SET "app.settings.edge_function_url" = 'https://project.supabase.co/functions/v1';
  -- For local development, they would set it to: 'http://kong:8000/functions/v1' or 'http://127.0.0.1:54321/functions/v1'

  begin
    v_url := current_setting('app.settings.edge_function_url');
  exception when others then
    -- Fallback to a placeholder. Admin must configure this!
    v_url := 'http://kong:8000/functions/v1';
  end;

  -- Fire the webhook
  perform net.http_post(
    url := v_url || '/process-background-job',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('msg_id', NEW.msg_id)
  );

  return NEW;
end;
$$;

-- 4. Attach the trigger to the pgmq queue table
create trigger on_background_job_inserted
after insert on pgmq.q_background_jobs for each row
execute function public.trigger_process_background_job ();

-- 5. Setup pg_cron sweeper (assuming pg_cron is enabled)
create extension if not exists pg_cron cascade;

-- Schedule the sweeper to run every 15 minutes
-- We use a wrapper function for the cron job to call the edge function via pg_net
create or replace function public.sweep_background_jobs () returns void language plpgsql security definer as $$
declare
  v_url text;
  v_secret text;
begin
  begin
    v_url := current_setting('app.settings.edge_function_url');
  exception when others then
    v_url := 'http://kong:8000/functions/v1';
  end;

  perform net.http_post(
    url := v_url || '/process-background-job',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('source', 'cron')
  );
end;
$$;

-- Note: In Supabase, you typically configure pg_cron via the dashboard or using standard cron schema
-- The exact database name might vary (usually postgres). We will just schedule it.
select
  cron.schedule (
    'sweep_background_jobs',
    '*/15 * * * *',
    'select public.sweep_background_jobs();'
  );
