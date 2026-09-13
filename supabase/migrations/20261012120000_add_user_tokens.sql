CREATE SEQUENCE IF NOT EXISTS public.user_token_seq;

CREATE TABLE IF NOT EXISTS public.user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT UNIQUE NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT 'USR_' || LPAD(nextval('public.user_token_seq')::TEXT, 2, '0'),
  created_at TIMESTAMPTZ DEFAULT timezone ('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to user_tokens" ON public.user_tokens FOR ALL TO service_role USING (true)
WITH
  CHECK (true);

GRANT ALL ON TABLE public.user_tokens TO service_role;

GRANT USAGE,
SELECT
  ON SEQUENCE public.user_token_seq TO service_role;
