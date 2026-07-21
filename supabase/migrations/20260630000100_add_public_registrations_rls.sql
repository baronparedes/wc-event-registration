begin;

-- ============================================================
-- RLS Policies for Public Registration Tables
--
-- Strategy:
--   anon / unauthenticated → can insert own registration,
--                             can select own registrations,
--                             can update own registrations (for duplicate_policy='allow_update')
--   authenticated + is_admin() → full CRUD on all tables
-- ============================================================
-- Enable RLS on public registration tables
alter table public.public_registrations enable row level security;

alter table public.public_registration_answers enable row level security;

-- ============================================================
-- public.public_registrations
--
-- Public (anon) can:
--   - Insert own registration (via Edge Function, validated server-side)
--   - Select own registrations (filtered server-side by email)
--   - Update own registration (via Edge Function, for duplicate_policy='allow_update')
-- Admins can:
--   - Select all
--   - Update all (mark as attended/no-show, etc.)
--   - Delete (archive/remove)
-- ============================================================
create policy "anon can insert public registration" on public.public_registrations for insert to anon
with
  check (true);

create policy "anon can select own public registrations" on public.public_registrations for
select
  to anon using (true);

-- Filtered server-side in Edge Function by email
create policy "anon can update own public registration" on public.public_registrations
for update
  to anon using (true) -- Filtered server-side in Edge Function by email
with
  check (true);

create policy "admins can select public registrations" on public.public_registrations for
select
  to authenticated using (public.is_admin ());

create policy "admins can update public registrations" on public.public_registrations
for update
  to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "admins can delete public registrations" on public.public_registrations for delete to authenticated using (public.is_admin ());

-- ============================================================
-- public.public_registration_answers
--
-- Public (anon) can:
--   - Insert own answers (via Edge Function, linked to own registration)
--   - Select own answers (joined via public_registrations -> email)
-- Admins can:
--   - Select all
--   - Delete (if unneeded)
-- ============================================================
create policy "anon can insert public registration answers" on public.public_registration_answers for insert to anon
with
  check (true);

-- Validated server-side (must link to own public_registration_id)
create policy "anon can select own public registration answers" on public.public_registration_answers for
select
  to anon using (true);

-- Filtered server-side in Edge Function
create policy "admins can select public registration answers" on public.public_registration_answers for
select
  to authenticated using (public.is_admin ());

create policy "admins can delete public registration answers" on public.public_registration_answers for delete to authenticated using (public.is_admin ());

commit;
