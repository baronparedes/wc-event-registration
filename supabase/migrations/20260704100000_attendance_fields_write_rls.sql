begin;

-- attendance_fields: admins get full CRUD via PostgREST
create policy "admins can insert attendance fields" on public.attendance_fields for insert to authenticated
with
  check (public.is_admin ());

create policy "admins can update attendance fields" on public.attendance_fields
for update
  to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "admins can delete attendance fields" on public.attendance_fields for delete to authenticated using (public.is_admin ());

-- attendance_answers: admins get full CRUD via PostgREST
create policy "admins can insert attendance answers" on public.attendance_answers for insert to authenticated
with
  check (public.is_admin ());

create policy "admins can update attendance answers" on public.attendance_answers
for update
  to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "admins can delete attendance answers" on public.attendance_answers for delete to authenticated using (public.is_admin ());

-- Grant write privileges to authenticated role
grant insert,
update,
delete on table public.attendance_fields to authenticated;

grant insert,
update,
delete on table public.attendance_answers to authenticated;

commit;
