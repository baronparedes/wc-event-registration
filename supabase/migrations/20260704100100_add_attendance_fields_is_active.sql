begin;

alter table public.attendance_fields
add column is_active boolean not null default true;

commit;
