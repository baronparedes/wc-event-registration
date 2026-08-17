begin;

alter table public.attendance_saved_views
add column sort_order smallint not null default 0;

commit;
