-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgmq CASCADE;

CREATE EXTENSION IF NOT EXISTS pg_net CASCADE;

CREATE EXTENSION IF NOT EXISTS pg_cron CASCADE;

-- Create pgmq queue
SELECT
  pgmq.create ('email_notifications');

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  resend_template_id TEXT NOT NULL,
  required_variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated admins
CREATE POLICY "Allow read access to authenticated admins for email templates" ON public.email_templates FOR
SELECT
  TO authenticated USING (public.is_admin ());

-- Allow write access to authenticated admins
CREATE POLICY "Allow write access to authenticated admins for email templates" ON public.email_templates FOR ALL TO authenticated USING (public.is_admin ())
WITH
  CHECK (public.is_admin ());

-- Helper function to trigger edge function
CREATE OR REPLACE FUNCTION public.trigger_email_processor () RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public AS $$
DECLARE
    project_url TEXT;
BEGIN
    -- In production, this should point to the actual edge function URL
    -- For local dev, it needs to point to the local edge function URL
    -- Note: for a more robust setup, you would store this in vault or a config table
    -- Defaulting to a safe no-op if app.settings.project_url is missing
    BEGIN
        project_url := current_setting('app.settings.project_url', TRUE);
    EXCEPTION WHEN OTHERS THEN
        project_url := NULL;
    END;

    IF project_url IS NOT NULL THEN
        PERFORM net.http_post(
            url := project_url || '/functions/v1/process-email-queue',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', TRUE)
            )
        );
    END IF;
END;
$$;

-- Schedule pg_cron sweeper job to run hourly
-- Note: cron.schedule must run in the postgres database, and requires superuser.
-- In Supabase, standard usage is to define the cron in migrations.
SELECT
  cron.schedule (
    'process_email_queue_hourly',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.project_url', TRUE) || '/functions/v1/process-email-queue',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', TRUE)
        )
    );
    $$
  );

-- Wrapper function to enqueue messages securely via postgrest
CREATE OR REPLACE FUNCTION public.enqueue_email_notification (payload JSONB) RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public,
  pgmq AS $$
DECLARE
    msg_id BIGINT;
BEGIN
    SELECT pgmq.send('email_notifications', payload) INTO msg_id;
    RETURN msg_id;
END;
$$;

-- Allow authenticated admins to enqueue messages
GRANT
EXECUTE ON FUNCTION public.enqueue_email_notification (JSONB) TO authenticated;

-- Allow service_role to enqueue messages
GRANT
EXECUTE ON FUNCTION public.enqueue_email_notification (JSONB) TO service_role;

-- Wrapper function to read and lock messages for processing
CREATE OR REPLACE FUNCTION public.pop_email_notifications (batch_size INT DEFAULT 10) RETURNS TABLE (
  msg_id BIGINT,
  read_ct INT,
  enqueued_at TIMESTAMPTZ,
  vt TIMESTAMPTZ,
  message JSONB
) LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public,
  pgmq AS $$
BEGIN
    RETURN QUERY SELECT * FROM pgmq.read('email_notifications', 30, batch_size);
END;
$$;

GRANT
EXECUTE ON FUNCTION public.pop_email_notifications (INT) TO service_role;

-- Wrapper function to acknowledge and delete a message
CREATE OR REPLACE FUNCTION public.archive_email_notification (message_id BIGINT) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public,
  pgmq AS $$
DECLARE
    archived BOOLEAN;
BEGIN
    SELECT pgmq.archive('email_notifications', message_id) INTO archived;
    RETURN archived;
END;
$$;

GRANT
EXECUTE ON FUNCTION public.archive_email_notification (BIGINT) TO service_role;
