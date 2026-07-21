begin;

alter table public.attendance_settings
drop constraint if exists attendance_settings_dependency_check;

alter table public.attendance_settings
drop column if exists walk_in_mode_enabled;

alter table public.attendance_settings
add constraint attendance_settings_dependency_check check (
  attendance_enabled
  or not timeslot_enabled
);

commit;
