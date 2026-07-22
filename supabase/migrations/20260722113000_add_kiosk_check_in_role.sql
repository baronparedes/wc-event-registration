begin;

alter table public.admins
drop constraint if exists admins_role_allowed;

alter table public.admins
add constraint admins_role_allowed check (role in ('admin', 'super_admin', 'slod', 'kiosk'));

create or replace function public.is_check_in_operator () returns boolean language sql security definer stable
set
  search_path = public as $$
    select exists
    (
      select 1
      from public.admins
      where auth_user_id = auth.uid()
        and role in ('admin', 'super_admin', 'kiosk')
    );
$$;

create policy "admins and kiosk can read all events" on public.events for
select
  to authenticated using (public.is_check_in_operator ());

create policy "admins and kiosk can read attendance settings" on public.attendance_settings for
select
  to authenticated using (public.is_check_in_operator ());

create policy "admins and kiosk can read attendance check ins" on public.attendance_check_ins for
select
  to authenticated using (public.is_check_in_operator ());

create policy "admins and kiosk can read attendance slot records" on public.attendance_slot_records for
select
  to authenticated using (public.is_check_in_operator ());

commit;
