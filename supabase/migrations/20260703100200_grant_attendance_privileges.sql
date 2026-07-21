begin;

grant
select
  on table public.attendance_settings to authenticated;

grant
select
  on table public.attendance_fields to authenticated;

grant
select
  on table public.attendance_answers to authenticated;

grant
select
  on table public.attendance_walk_ins to authenticated;

grant
select
  on table public.attendance_check_ins to authenticated;

grant
select
  on table public.attendance_slot_records to authenticated;

grant all on table public.attendance_settings to service_role;

grant all on table public.attendance_fields to service_role;

grant all on table public.attendance_answers to service_role;

grant all on table public.attendance_walk_ins to service_role;

grant all on table public.attendance_check_ins to service_role;

grant all on table public.attendance_slot_records to service_role;

commit;
