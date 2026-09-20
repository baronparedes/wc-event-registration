begin;

create or replace function public.get_service_dashboard_stats (
  p_year integer default null,
  p_month integer default null,
  p_sunday_date date default null
) returns jsonb language plpgsql security definer
set
  search_path = public as $$
declare
  v_start_date date;
  v_end_date date;
  v_sundays date[];
  v_result jsonb;
begin
  -- Access check
  if not (
    public.is_admin_viewer()
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'Access denied: Requires admin viewer role';
  end if;

  -- Determine date range and target Sundays
  if p_sunday_date is not null then
    v_start_date := p_sunday_date;
    v_end_date := p_sunday_date;
  elsif p_year is not null and p_month is not null then
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := (v_start_date + interval '1 month' - interval '1 day')::date;
  elsif p_year is not null then
    v_start_date := make_date(p_year, 1, 1);
    v_end_date := make_date(p_year, 12, 31);
  else
    raise exception 'Must provide at least a year or a specific sunday date';
  end if;

  -- Ensure we only consider Sundays
  select array_agg(d::date) into v_sundays
  from generate_series(v_start_date, v_end_date, '1 day'::interval) d
  where extract(dow from d) = 0;

  if v_sundays is null then
    -- Return empty skeleton if no Sundays found in range
    return jsonb_build_object(
      'time_slots', jsonb_build_object(
        '9:00 AM', jsonb_build_object('committed', 0, 'present', 0, 'walk_ins', 0, 'late_tardy', 0, 'roles', '{}'::jsonb),
        '12NN', jsonb_build_object('committed', 0, 'present', 0, 'walk_ins', 0, 'late_tardy', 0, 'roles', '{}'::jsonb),
        '3:00 PM', jsonb_build_object('committed', 0, 'present', 0, 'walk_ins', 0, 'late_tardy', 0, 'roles', '{}'::jsonb)
      ),
      'roles', '[]'::jsonb
    );
  end if;

  with expanded_sundays as (
    select
      s.sunday_date,
      extract(day from s.sunday_date)::integer / 7 + case when extract(day from s.sunday_date)::integer % 7 > 0 then 1 else 0 end as ordinal,
      case (extract(day from s.sunday_date)::integer / 7 + case when extract(day from s.sunday_date)::integer % 7 > 0 then 1 else 0 end)
        when 1 then 'first_sunday'
        when 2 then 'second_sunday'
        when 3 then 'third_sunday'
        when 4 then 'fourth_sunday'
        else 'fifth_sunday'
      end as ckey
    from unnest(v_sundays) as s(sunday_date)
  ),
  -- 1. Calculate Commitments
  commitments as (
    select
      es.sunday_date,
      ts.time_slot,
      count(u.id) as count
    from expanded_sundays es
    cross join (values ('9:00 AM'), ('12NN'), ('3:00 PM')) as ts(time_slot)
    cross join public.users u
    where (
      coalesce(
        (select metadata->>es.ckey from public.user_commitment_history sub_ch where sub_ch.user_id = u.id and sub_ch.effective_date <= es.sunday_date order by sub_ch.effective_date desc limit 1),
        u.metadata->>es.ckey
      ) ilike '%' || ts.time_slot || '%'
    )
    and u.is_active = true
    group by es.sunday_date, ts.time_slot
  ),
  aggregated_commitments as (
    select
      time_slot,
      sum(count)::integer as total_committed
    from commitments
    group by time_slot
  ),
  -- 2. Calculate Attendance Data
  attendance_data as (
    select
      sa.time_slot,
      sa.user_id,
      sa.is_walk_in,
      sa.is_override,
      split_part(coalesce(nullif(trim(u.role), ''), u.metadata->>'role'), '/', 1) as primary_role
    from public.service_attendance sa
    join public.users u on u.id = sa.user_id
    where sa.service_date = any(v_sundays)
      and sa.time_slot in ('9:00 AM', '12NN', '3:00 PM')
  ),
  aggregated_attendance as (
    select
      time_slot,
      count(user_id) filter (where is_walk_in = false) as total_present,
      count(user_id) filter (where is_walk_in = true) as total_walk_ins,
      count(user_id) filter (where is_override = true) as total_late_tardy
    from attendance_data
    group by time_slot
  ),
  -- 3. Calculate Role Aggregations
  role_data as (
    select
      trim(primary_role) as role_name,
      time_slot,
      count(user_id) filter (where is_walk_in = false) as count
    from attendance_data
    where trim(primary_role) != ''
    group by trim(primary_role), time_slot
  ),
  all_roles as (
    select distinct role_name from role_data
  ),
  time_slots as (
    select unnest(array['9:00 AM', '12NN', '3:00 PM']) as time_slot
  ),
  combined_stats as (
    select
      ts.time_slot,
      coalesce(ac.total_committed, 0) as committed,
      coalesce(aa.total_present, 0) as present,
      coalesce(aa.total_walk_ins, 0) as walk_ins,
      coalesce(aa.total_late_tardy, 0) as late_tardy,
      (
        select jsonb_object_agg(rd.role_name, rd.count)
        from role_data rd
        where rd.time_slot = ts.time_slot
      ) as role_counts
    from time_slots ts
    left join aggregated_commitments ac on ac.time_slot = ts.time_slot
    left join aggregated_attendance aa on aa.time_slot = ts.time_slot
  )
  select jsonb_build_object(
    'time_slots', jsonb_object_agg(
      time_slot,
      jsonb_build_object(
        'committed', committed,
        'present', present,
        'walk_ins', walk_ins,
        'late_tardy', late_tardy,
        'roles', coalesce(role_counts, '{}'::jsonb)
      )
    ),
    'roles', (select jsonb_agg(role_name) from all_roles)
  ) into v_result
  from combined_stats;

  return v_result;

end;
$$;

revoke
execute on function public.get_service_dashboard_stats (integer, integer, date)
from
  public,
  anon,
  authenticated;

grant
execute on function public.get_service_dashboard_stats (integer, integer, date) to authenticated,
service_role;

commit;
