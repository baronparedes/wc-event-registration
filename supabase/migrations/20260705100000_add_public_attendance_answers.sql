begin;

create table public.public_attendance_answers (
  id uuid primary key default gen_random_uuid(),
  public_registration_id uuid not null references public.public_registrations (id) on delete cascade,
  attendance_field_id uuid not null references public.attendance_fields (id) on delete cascade,
  answer_text text,
  answer_number numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_attendance_answers_unique unique (public_registration_id, attendance_field_id),
  constraint public_attendance_answers_value_present check (
    answer_text is not null
    or answer_number is not null
  )
);

create index public_attendance_answers_registration_idx on public.public_attendance_answers (public_registration_id);

create index public_attendance_answers_field_idx on public.public_attendance_answers (attendance_field_id);

create trigger public_attendance_answers_set_updated_at
before update on public.public_attendance_answers for each row
execute function public.set_updated_at ();

alter table public.public_attendance_answers enable row level security;

create policy "admins can read public attendance answers" on public.public_attendance_answers for
select
  to authenticated using (public.is_admin ());

create policy "admins can insert public attendance answers" on public.public_attendance_answers for insert to authenticated
with
  check (public.is_admin ());

create policy "admins can update public attendance answers" on public.public_attendance_answers
for update
  to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "admins can delete public attendance answers" on public.public_attendance_answers for delete to authenticated using (public.is_admin ());

grant
select
,
  insert,
update,
delete on table public.public_attendance_answers to authenticated;

grant all on table public.public_attendance_answers to service_role;

commit;
