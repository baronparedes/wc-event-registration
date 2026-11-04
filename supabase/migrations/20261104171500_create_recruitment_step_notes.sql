-- Migration: 20261104171500_create_recruitment_step_notes.sql
-- Description: Create recruitment_step_notes table for append-only recruiter discussion threads per step
begin;

create table if not exists public.recruitment_step_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.recruitment_applications (id) on delete cascade,
  step_number int not null check (step_number between 1 and 9),
  attempt_number int not null default 1,
  transaction_id uuid references public.recruitment_pipeline_transactions (id) on delete set null,
  author_id uuid,
  author_name text not null,
  author_role text,
  avatar_object_key text,
  content text not null,
  created_at timestamptz not null default now()
);

-- Drop foreign key constraint on author_id so notes can reference reviewers across auth.users or public.users
alter table public.recruitment_step_notes
drop constraint if exists recruitment_step_notes_author_id_fkey;

create index if not exists idx_recruitment_step_notes_app_step on public.recruitment_step_notes (application_id, step_number, created_at asc);

alter table public.recruitment_step_notes enable row level security;

drop policy if exists "Reviewers can read recruitment step notes" on public.recruitment_step_notes;

create policy "Reviewers can read recruitment step notes" on public.recruitment_step_notes for
select
  to authenticated using (public.is_recruitment_reviewer ());

drop policy if exists "Reviewers can insert recruitment step notes" on public.recruitment_step_notes;

create policy "Reviewers can insert recruitment step notes" on public.recruitment_step_notes for insert to authenticated
with
  check (public.is_recruitment_reviewer ());

-- Backfill legacy notes from existing transactions
insert into
  public.recruitment_step_notes (
    application_id,
    step_number,
    attempt_number,
    transaction_id,
    author_id,
    author_name,
    content,
    created_at
  )
select
  tx.application_id,
  tx.step_number,
  tx.attempt_number,
  tx.id,
  tx.assigned_reviewer_id,
  coalesce(tx.assigned_reviewer_name, 'Recruitment Reviewer'),
  tx.notes,
  coalesce(tx.completed_at, tx.scheduled_at, tx.created_at)
from
  public.recruitment_pipeline_transactions tx
where
  tx.notes is not null
  and trim(tx.notes) <> ''
on conflict do nothing;

commit;
