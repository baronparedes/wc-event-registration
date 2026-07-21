begin;

grant
select
,
  insert,
update,
delete on table public.attendance_saved_views to authenticated;

grant all on table public.attendance_saved_views to service_role;

commit;
