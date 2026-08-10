begin;

create or replace function public.is_admin () returns boolean language sql security definer stable
set
  search_path = public as $$
  select exists
  (
    select 1
  from public.admins
  where auth_user_id = auth.uid()
    and role in ('admin', 'super_admin')
  );
  $$;

create or replace function public.is_admin_viewer () returns boolean language sql security definer stable
set
  search_path = public as $$
select exists
(
    select 1
from public.admins
where auth_user_id = auth.uid()
  and role in ('admin', 'super_admin', 'slod')
  );
$$;

create or replace function public.is_admin_member_viewer () returns boolean language sql security definer stable
set
  search_path = public as $$
select exists
(
    select 1
from public.admins
where auth_user_id = auth.uid()
  and role in ('admin', 'super_admin', 'slod', 'imt')
  );
$$;

create or replace function public.is_kiosk () returns boolean language sql security definer stable
set
  search_path = public as $$
select exists
(
    select 1
from public.admins
where auth_user_id = auth.uid()
  and role = 'kiosk'
  );
$$;

drop policy if exists "admins can select users" on public.users;

drop policy if exists "admins and slod can read users" on public.users;

drop policy if exists "member readers can read users" on public.users;

create policy "member readers can read users" on public.users for
select
  to authenticated using (public.is_admin_member_viewer ());

drop policy if exists "admins and slod can read all events" on public.events;

drop policy if exists "admins and kiosk can read all events" on public.events;

drop policy if exists "admin viewers can read all events" on public.events;

drop policy if exists "kiosk can read all events" on public.events;

create policy "admin viewers can read all events" on public.events for
select
  to authenticated using (public.is_admin_viewer ());

create policy "kiosk can read all events" on public.events for
select
  to authenticated using (public.is_kiosk ());

drop policy if exists "admins and slod can read all event fields" on public.event_fields;

drop policy if exists "admin viewers can read all event fields" on public.event_fields;

create policy "admin viewers can read all event fields" on public.event_fields for
select
  to authenticated using (public.is_admin_viewer ());

drop policy if exists "admins and slod can read registrations" on public.registrations;

drop policy if exists "admin viewers can read registrations" on public.registrations;

create policy "admin viewers can read registrations" on public.registrations for
select
  to authenticated using (public.is_admin_viewer ());

drop policy if exists "admins and slod can read registration answers" on public.registration_answers;

drop policy if exists "admin viewers can read registration answers" on public.registration_answers;

create policy "admin viewers can read registration answers" on public.registration_answers for
select
  to authenticated using (public.is_admin_viewer ());

drop policy if exists "admins and slod can read import staging" on public.users_import_staging;

drop policy if exists "admins and slod can read import errors" on public.import_errors;

drop policy if exists "admins can select public registrations" on public.public_registrations;

drop policy if exists "admins and slod can read public registrations" on public.public_registrations;

drop policy if exists "admin viewers can read public registrations" on public.public_registrations;

create policy "admin viewers can read public registrations" on public.public_registrations for
select
  to authenticated using (public.is_admin_viewer ());

drop policy if exists "admins can select public registration answers" on public.public_registration_answers;

drop policy if exists "admins and slod can read public registration answers" on public.public_registration_answers;

drop policy if exists "admin viewers can read public registration answers" on public.public_registration_answers;

create policy "admin viewers can read public registration answers" on public.public_registration_answers for
select
  to authenticated using (public.is_admin_viewer ());

drop policy if exists "admins can read attendance settings" on public.attendance_settings;

drop policy if exists "admins and slod can read attendance settings" on public.attendance_settings;

drop policy if exists "admins and kiosk can read attendance settings" on public.attendance_settings;

drop policy if exists "admin viewers can read attendance settings" on public.attendance_settings;

drop policy if exists "kiosk can read attendance settings" on public.attendance_settings;

create policy "admin viewers can read attendance settings" on public.attendance_settings for
select
  to authenticated using (public.is_admin_viewer ());

create policy "kiosk can read attendance settings" on public.attendance_settings for
select
  to authenticated using (public.is_kiosk ());

drop policy if exists "admins can read attendance fields" on public.attendance_fields;

drop policy if exists "admins and slod can read attendance fields" on public.attendance_fields;

drop policy if exists "admin viewers can read attendance fields" on public.attendance_fields;

create policy "admin viewers can read attendance fields" on public.attendance_fields for
select
  to authenticated using (public.is_admin_viewer ());

drop policy if exists "admins can read attendance answers" on public.attendance_answers;

drop policy if exists "admins and slod can read attendance answers" on public.attendance_answers;

drop policy if exists "admin viewers can read attendance answers" on public.attendance_answers;

create policy "admin viewers can read attendance answers" on public.attendance_answers for
select
  to authenticated using (public.is_admin_viewer ());

drop policy if exists "admins can read attendance check ins" on public.attendance_check_ins;

drop policy if exists "admins and slod can read attendance check ins" on public.attendance_check_ins;

drop policy if exists "admins and kiosk can read attendance check ins" on public.attendance_check_ins;

drop policy if exists "admin viewers can read attendance check ins" on public.attendance_check_ins;

drop policy if exists "kiosk can read attendance check ins" on public.attendance_check_ins;

create policy "admin viewers can read attendance check ins" on public.attendance_check_ins for
select
  to authenticated using (public.is_admin_viewer ());

create policy "kiosk can read attendance check ins" on public.attendance_check_ins for
select
  to authenticated using (public.is_kiosk ());

drop policy if exists "admins can read attendance slot records" on public.attendance_slot_records;

drop policy if exists "admins and slod can read attendance slot records" on public.attendance_slot_records;

drop policy if exists "admins and kiosk can read attendance slot records" on public.attendance_slot_records;

drop policy if exists "admin viewers can read attendance slot records" on public.attendance_slot_records;

drop policy if exists "kiosk can read attendance slot records" on public.attendance_slot_records;

create policy "admin viewers can read attendance slot records" on public.attendance_slot_records for
select
  to authenticated using (public.is_admin_viewer ());

create policy "kiosk can read attendance slot records" on public.attendance_slot_records for
select
  to authenticated using (public.is_kiosk ());

drop policy if exists "admins can read public attendance answers" on public.public_attendance_answers;

drop policy if exists "admins and slod can read public attendance answers" on public.public_attendance_answers;

drop policy if exists "admin viewers can read public attendance answers" on public.public_attendance_answers;

create policy "admin viewers can read public attendance answers" on public.public_attendance_answers for
select
  to authenticated using (public.is_admin_viewer ());

drop policy if exists "admins and slod can read attendance saved views" on public.attendance_saved_views;

drop policy if exists "admins and slod can insert attendance saved views" on public.attendance_saved_views;

drop policy if exists "admins and slod can update attendance saved views" on public.attendance_saved_views;

drop policy if exists "admin viewers can read attendance saved views" on public.attendance_saved_views;

drop policy if exists "admin viewers can insert attendance saved views" on public.attendance_saved_views;

drop policy if exists "admin viewers can update attendance saved views" on public.attendance_saved_views;

drop policy if exists "admin viewers can delete attendance saved views" on public.attendance_saved_views;

create policy "admin viewers can read attendance saved views" on public.attendance_saved_views for
select
  to authenticated using (public.is_admin_viewer ());

create policy "admin viewers can insert attendance saved views" on public.attendance_saved_views for insert to authenticated
with
  check (public.is_admin_viewer ());

create policy "admin viewers can update attendance saved views" on public.attendance_saved_views
for update
  to authenticated using (public.is_admin_viewer ())
with
  check (public.is_admin_viewer ());

create policy "admin viewers can delete attendance saved views" on public.attendance_saved_views for delete to authenticated using (public.is_admin_viewer ());

commit;
