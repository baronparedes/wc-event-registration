-- ============================================================
-- RLS Policy Test Matrix — Chunk 2
--
-- Purpose: verify every policy is wired correctly after
--          running `npm run supabase:db:reset`.
--
-- How to use:
--   1. Open Supabase Studio → SQL Editor
--      (http://127.0.0.1:54323)
--   2. Run each block individually; read the expected result
--      comments to confirm pass/fail.
--
-- Sections:
--   A. Baseline helpers
--   B. Unauthenticated (anon role) tests
--   C. Authenticated non-admin tests
--   D. Admin tests
--   E. Cleanup
-- ============================================================
-- ============================================================
-- A. BASELINE HELPERS
-- ============================================================
-- A1. Confirm RLS is enabled on all target tables
-- Expected: 8 rows, each with rowsecurity = true
select
  tablename,
  rowsecurity
from
  pg_tables
where
  schemaname = 'public'
  and tablename in (
    'users',
    'admins',
    'events',
    'event_fields',
    'registrations',
    'registration_answers',
    'users_import_staging',
    'import_errors'
  )
order by
  tablename;

-- A2. Confirm all expected policies exist
-- Expected: one row per policy listed below
select
  tablename,
  policyname
from
  pg_policies
where
  schemaname = 'public'
order by
  tablename,
  policyname;

-- ============================================================
-- B. UNAUTHENTICATED (anon role) TESTS
--
-- Simulate the browser's anon key with no login.
-- In Supabase, SET LOCAL ROLE anon restricts to the anon role.
-- ============================================================
-- B1. anon can read a published event
-- Setup: insert a published event, then verify visibility
begin;

set
  local role anon;

insert into
  public.events (slug, title, status)
values
  ('test-published', 'Published Event', 'published');

-- ^ this INSERT should FAIL because anon has no write policy
-- Expected: ERROR: new row violates row-level security policy for table "events"
rollback;

-- B2. anon sees published events via SELECT
begin;

-- Insert as postgres (no RLS enforcement for superuser)
insert into
  public.events (slug, title, status)
values
  ('test-published', 'Published Event', 'published');

set
  local role anon;

select
  id,
  slug,
  title,
  status
from
  public.events;

-- Expected: 1 row returned (the published event)
rollback;

-- B3. anon cannot see draft events
begin;

insert into
  public.events (slug, title, status)
values
  ('test-draft', 'Draft Event', 'draft');

set
  local role anon;

select
  id,
  slug,
  title,
  status
from
  public.events;

-- Expected: 0 rows (draft is filtered out)
rollback;

-- B4. anon cannot read users at all
begin;

set
  local role anon;

select
  count(*)
from
  public.users;

-- Expected: 0 rows (policy denies all access to anon)
rollback;

-- B5. anon cannot read registrations
begin;

set
  local role anon;

select
  count(*)
from
  public.registrations;

-- Expected: 0 rows
rollback;

-- B6. anon cannot read import staging
begin;

set
  local role anon;

select
  count(*)
from
  public.users_import_staging;

-- Expected: 0 rows
rollback;

-- ============================================================
-- C. AUTHENTICATED NON-ADMIN TESTS
--
-- Simulate a logged-in user who is NOT in the admins table.
-- Use set_config to provide a fake JWT claim with a test UUID.
-- ============================================================
-- C1. Non-admin authenticated user cannot read users table
begin;

-- Provide a JWT uid that does NOT exist in public.admins
set
  local role authenticated;

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select
  count(*)
from
  public.users;

-- Expected: 0 rows (is_admin() returns false → policy denies)
rollback;

-- C2. Non-admin authenticated user can still read published events
begin;

insert into
  public.events (slug, title, status)
values
  ('test-published', 'Published Event', 'published');

set
  local role authenticated;

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select
  id,
  slug,
  status
from
  public.events;

-- Expected: 1 row (published event is visible to any role)
rollback;

-- C3. Non-admin authenticated user cannot read draft events
begin;

insert into
  public.events (slug, title, status)
values
  ('test-draft', 'Draft Event', 'draft');

set
  local role authenticated;

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select
  id,
  slug,
  status
from
  public.events;

-- Expected: 0 rows
rollback;

-- ============================================================
-- D. ADMIN TESTS
--
-- Simulate a logged-in admin user.
-- The admin's auth_user_id must exist in auth.users AND
-- public.admins for is_admin() to return true.
-- ============================================================
-- D1. Setup: create a test admin identity
-- (Supabase local: insert directly into auth.users is allowed)
begin;

-- Create a fake auth user
insert into
  auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  )
values
  (
    '00000000-0000-0000-0000-000000000099',
    'admin@test.local',
    'not-used',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  );

-- Register them as an admin
insert into
  public.admins (auth_user_id, role)
values
  ('00000000-0000-0000-0000-000000000099', 'admin');

-- Switch to authenticated role with this user's JWT
set
  local role authenticated;

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000099", "role": "authenticated"}';

-- D1a. is_admin() should return true
select
  public.is_admin ();

-- Expected: true
-- D1b. Admin can read users
select
  count(*)
from
  public.users;

-- Expected: integer (whatever rows exist), no RLS error
-- D1c. Admin can read ALL events (including draft)
insert into
  public.events (slug, title, status)
values
  ('draft-ev', 'Draft', 'draft'),
  ('pub-ev', 'Published', 'published');

select
  slug,
  status
from
  public.events
order by
  slug;

-- Expected: 2 rows (draft-ev and pub-ev)
-- D1d. Admin can read import staging
select
  count(*)
from
  public.users_import_staging;

-- Expected: integer (no policy error)
-- D1e. Admin can read their own admins row
select
  auth_user_id,
  role
from
  public.admins;

-- Expected: 1 row for the test admin
rollback;

-- ============================================================
-- E. EVENT_FIELDS VISIBILITY TESTS
-- ============================================================
-- E1. anon sees fields only for published events
begin;

insert into
  public.events (id, slug, title, status)
values
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'pub',
    'Published',
    'published'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    'drft',
    'Draft',
    'draft'
  );

insert into
  public.event_fields (event_id, field_key, label, field_type)
values
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'name',
    'Name',
    'text'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    'secret',
    'Secret',
    'text'
  );

set
  local role anon;

select
  field_key
from
  public.event_fields;

-- Expected: 1 row — 'name' only (field for published event)
-- 'secret' is hidden because its event is draft
rollback;

-- ============================================================
-- F. MEMBER LOOKUP RPC TESTS (CHUNK 3)
-- ============================================================
-- F1. anon can execute lookup RPC and receive minimal profile fields
begin;

insert into
  public.users (
    id,
    member_id,
    full_name,
    first_name,
    last_name,
    nickname
  )
values
  (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'MEM-1001',
    'Alex Rivera',
    'Alex',
    'Rivera',
    'Lex'
  );

set
  local role anon;

select
  user_id,
  full_name,
  nickname,
  first_name,
  last_name
from
  public.lookup_member_for_registration ('MEM-1001');

-- Expected: 1 row with the inserted values
rollback;

-- F2. anon still cannot read users directly
begin;

set
  local role anon;

select
  count(*)
from
  public.users;

-- Expected: 0 rows (RLS still blocks direct reads)
rollback;

-- F3. authenticated non-admin can execute lookup RPC
begin;

insert into
  public.users (
    id,
    member_id,
    full_name,
    first_name,
    last_name,
    nickname
  )
values
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    'MEM-1002',
    'Jamie Santos',
    'Jamie',
    'Santos',
    'Jay'
  );

set
  local role authenticated;

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select
  user_id,
  full_name,
  nickname,
  first_name,
  last_name
from
  public.lookup_member_for_registration ('MEM-1002');

-- Expected: 1 row with the inserted values
rollback;

-- F4. authenticated non-admin still cannot read users directly
begin;

set
  local role authenticated;

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select
  count(*)
from
  public.users;

-- Expected: 0 rows
rollback;

-- F5. blank member id returns no rows
begin;

set
  local role anon;

select
  *
from
  public.lookup_member_for_registration ('   ');

-- Expected: 0 rows
rollback;
