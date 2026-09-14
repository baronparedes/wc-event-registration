begin;

create sequence if not exists public.user_token_seq;

create table if not exists public.user_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.users (id) on delete cascade,
  token text unique not null default 'USR_' || lpad(nextval('public.user_token_seq')::text, 2, '0'),
  created_at timestamptz not null default timezone ('utc'::text, now())
);

alter table public.user_tokens enable row level security;

create policy "service role full access to user_tokens" on public.user_tokens for all to service_role using (true)
with
  check (true);

create policy "admins can view user_tokens" on public.user_tokens for
select
  to authenticated using (public.is_admin ());

grant all on table public.user_tokens to service_role;

grant usage,
select
  on sequence public.user_token_seq to service_role;

grant
select
  on table public.user_tokens to authenticated;

commit;
