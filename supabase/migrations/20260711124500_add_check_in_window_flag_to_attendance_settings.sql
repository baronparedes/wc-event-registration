begin;

    alter table public.attendance_settings
  add column
    if not exists enforce_check_in_event_window boolean not null default true;

commit;
