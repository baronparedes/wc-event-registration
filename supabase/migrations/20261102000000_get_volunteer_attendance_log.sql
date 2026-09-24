create or replace function public.get_volunteer_attendance_log (
  p_user_id uuid,
  p_start_date date,
  p_end_date date
) returns table (
  id uuid,
  service_date date,
  time_slot text,
  is_walk_in boolean,
  is_override boolean,
  is_manual_entry boolean
) language plpgsql security definer
set
  search_path = public as $$
begin
  return query
  select
    sa.id,
    sa.service_date,
    sa.time_slot,
    sa.is_walk_in,
    sa.is_override,
    sa.is_manual_entry
  from public.service_attendance sa
  where sa.user_id = p_user_id
    and sa.service_date >= p_start_date
    and sa.service_date <= p_end_date
  order by sa.service_date desc, sa.time_slot asc;
end;
$$;

revoke
execute on function public.get_volunteer_attendance_log (uuid, date, date)
from
  public,
  anon,
  authenticated;

grant
execute on function public.get_volunteer_attendance_log (uuid, date, date) to authenticated,
service_role;

commit;
