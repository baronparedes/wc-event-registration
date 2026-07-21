begin;

alter table public.admins
drop constraint if exists admins_role_allowed;

alter table public.admins
add constraint admins_role_allowed check (role in ('admin', 'super_admin', 'slod'));

create or replace function public.is_admin_or_slod () returns boolean language sql security definer stable
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

create policy "admins and slod can read users" on public.users for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read all events" on public.events for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read all event fields" on public.event_fields for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read registrations" on public.registrations for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read registration answers" on public.registration_answers for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read import staging" on public.users_import_staging for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read import errors" on public.import_errors for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read public registrations" on public.public_registrations for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read public registration answers" on public.public_registration_answers for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read attendance settings" on public.attendance_settings for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read attendance fields" on public.attendance_fields for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read attendance answers" on public.attendance_answers for
select
  to authenticated using (public.is_admin_or_slod ());

do $$
begin
    if to_regclass('public.attendance_walk_ins') is not null then
    execute $policy$
    create policy "admins and slod can read attendance walk ins"
        on public.attendance_walk_ins for
    select
        to authenticated
    using
    (public.is_admin_or_slod
    ());
$policy$;
end
if;
end
$$;

create policy "admins and slod can read attendance check ins" on public.attendance_check_ins for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read attendance slot records" on public.attendance_slot_records for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read public attendance answers" on public.public_attendance_answers for
select
  to authenticated using (public.is_admin_or_slod ());

create policy "admins and slod can read attendance saved views" on public.attendance_saved_views for
select
  to authenticated using (public.is_admin_or_slod ());

commit;
