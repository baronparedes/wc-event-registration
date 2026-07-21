begin;

alter table public.attendance_settings enable row level security;

alter table public.attendance_fields enable row level security;

alter table public.attendance_answers enable row level security;

alter table public.attendance_walk_ins enable row level security;

alter table public.attendance_check_ins enable row level security;

alter table public.attendance_slot_records enable row level security;

create policy "admins can read attendance settings" on public.attendance_settings for
select
  to authenticated using (public.is_admin ());

create policy "admins can read attendance fields" on public.attendance_fields for
select
  to authenticated using (public.is_admin ());

create policy "admins can read attendance answers" on public.attendance_answers for
select
  to authenticated using (public.is_admin ());

create policy "admins can read attendance walk ins" on public.attendance_walk_ins for
select
  to authenticated using (public.is_admin ());

create policy "admins can read attendance check ins" on public.attendance_check_ins for
select
  to authenticated using (public.is_admin ());

create policy "admins can read attendance slot records" on public.attendance_slot_records for
select
  to authenticated using (public.is_admin ());

commit;
