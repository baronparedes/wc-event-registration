begin;

-- ============================================================
-- Chunk 2: Row Level Security
--
-- Strategy:
--   anon / unauthenticated  → read-only, published data only
--   authenticated (non-admin) → same as anon for public tables
--   authenticated + is_admin() → full CRUD on all tables
--
-- All public registration writes go through security-definer
-- functions (Chunk 5), not direct table access.
-- ============================================================
-- ------------------------------------------------------------
-- Enable RLS on every public table
-- ------------------------------------------------------------
alter table public.users enable row level security;

alter table public.admins enable row level security;

alter table public.events enable row level security;

alter table public.event_fields enable row level security;

alter table public.registrations enable row level security;

alter table public.registration_answers enable row level security;

alter table public.users_import_staging enable row level security;

alter table public.import_errors enable row level security;

-- ------------------------------------------------------------
-- Helper: is_admin()
--
-- Returns true when the caller's auth.uid() matches a row in
-- public.admins.  SECURITY DEFINER lets this function bypass
-- the admins table's own RLS policy so there is no circular
-- dependency.  STABLE tells the planner the result is constant
-- within a single query, allowing it to be evaluated once.
-- ------------------------------------------------------------
create or replace function public.is_admin () returns boolean language sql security definer stable
set
  search_path = public as $$
select exists
(
    select 1
from public.admins
where auth_user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- public.users
--
-- No direct public access.  Membership ID lookup (Chunk 3) will
-- go through a security-definer function, not SELECT on this
-- table.  Admins get full CRUD for the import workflow and
-- profile corrections.
-- ------------------------------------------------------------
create policy "admins can select users" on public.users for
select
  to authenticated using (public.is_admin ());

create policy "admins can insert users" on public.users for insert to authenticated
with
  check (public.is_admin ());

create policy "admins can update users" on public.users
for update
  to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "admins can delete users" on public.users for delete to authenticated using (public.is_admin ());

-- ------------------------------------------------------------
-- public.admins
--
-- An admin can read their own row (needed for role checks in the
-- frontend).  No one can insert/update/delete through the API;
-- admin rows are managed by a super_admin directly in the DB.
-- ------------------------------------------------------------
create policy "admins can read own row" on public.admins for
select
  to authenticated using (auth_user_id = auth.uid ());

-- ------------------------------------------------------------
-- public.events
--
-- Anonymous visitors (and non-admin authenticated users) can
-- read published events to render the public registration page.
-- Admins get full CRUD so they can create, edit, and archive.
-- ------------------------------------------------------------
create policy "public can read published events" on public.events for
select
  to anon,
  authenticated using (status = 'published');

create policy "admins can manage events" on public.events for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

-- ------------------------------------------------------------
-- public.event_fields
--
-- Public visitors can read fields that belong to a published
-- event, so the registration form can be rendered.  Admins get
-- full CRUD for the field-builder in the admin panel.
-- ------------------------------------------------------------
create policy "public can read fields of published events" on public.event_fields for
select
  to anon,
  authenticated using (
    exists (
      select
        1
      from
        public.events e
      where
        e.id = event_id
        and e.status = 'published'
    )
  );

create policy "admins can manage event fields" on public.event_fields for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

-- ------------------------------------------------------------
-- public.registrations
--
-- No direct public write access.  In Chunk 5 a
-- SECURITY DEFINER function will handle the submit path so
-- the anon role never needs INSERT here.  Admins get full
-- access for the registrations list and status management.
-- ------------------------------------------------------------
create policy "admins can manage registrations" on public.registrations for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

-- ------------------------------------------------------------
-- public.registration_answers
--
-- Same reasoning as registrations.  Answers are written by the
-- same secure submit function.  Admin read is needed for the
-- detail view and CSV export.
-- ------------------------------------------------------------
create policy "admins can manage registration answers" on public.registration_answers for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

-- ------------------------------------------------------------
-- public.users_import_staging
-- public.import_errors
--
-- Import pipeline tables.  Admin-only; the anon role should
-- never see raw CSV data or error details.
-- ------------------------------------------------------------
create policy "admins can manage import staging" on public.users_import_staging for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "admins can manage import errors" on public.import_errors for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

commit;
