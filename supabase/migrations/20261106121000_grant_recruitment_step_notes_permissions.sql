-- Migration: 20261106121000_grant_recruitment_step_notes_permissions.sql
-- Description: Grant table privileges on public.recruitment_step_notes to authenticated and service_role, allowing super_admin, admin, slod, and vmt reviewers to select and insert notes.
begin;

-- Revoke unintended public and anon privileges
revoke all on public.recruitment_step_notes
from
  public,
  anon;

-- Grant select and insert to authenticated users (evaluated under RLS by public.is_recruitment_reviewer())
grant
select
,
  insert on public.recruitment_step_notes to authenticated;

-- Grant all privileges to service_role for edge functions and admin tools
grant all on public.recruitment_step_notes to service_role;

-- Ensure RLS is enabled and policies are defined idempotently
alter table public.recruitment_step_notes enable row level security;

drop policy if exists "Reviewers can read recruitment step notes" on public.recruitment_step_notes;

create policy "Reviewers can read recruitment step notes" on public.recruitment_step_notes for
select
  to authenticated using (public.is_recruitment_reviewer ());

drop policy if exists "Reviewers can insert recruitment step notes" on public.recruitment_step_notes;

create policy "Reviewers can insert recruitment step notes" on public.recruitment_step_notes for insert to authenticated
with
  check (public.is_recruitment_reviewer ());

commit;
