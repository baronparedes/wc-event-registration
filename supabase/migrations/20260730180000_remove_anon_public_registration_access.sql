begin;

-- All public_registrations writes go through Edge Functions (service_role, bypasses RLS).
-- All frontend reads are admin-only (authenticated). The anon policies are unused and
-- expose PII (names, emails, phone numbers) to unauthenticated direct API callers.
drop policy if exists "anon can insert public registration" on public.public_registrations;

drop policy if exists "anon can select own public registrations" on public.public_registrations;

drop policy if exists "anon can update own public registration" on public.public_registrations;

drop policy if exists "anon can insert public registration answers" on public.public_registration_answers;

drop policy if exists "anon can select own public registration answers" on public.public_registration_answers;

revoke insert,
select
,
update on table public.public_registrations
from
  anon;

revoke insert,
select
  on table public.public_registration_answers
from
  anon;

commit;
