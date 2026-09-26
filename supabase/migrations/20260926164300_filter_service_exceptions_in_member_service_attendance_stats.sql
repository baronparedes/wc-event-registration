begin;

create or replace function public.get_member_service_attendance_stats (
  p_start_date date,
  p_end_date date,
  p_search_query text default null,
  p_page integer default 1,
  p_page_size integer default 50
) returns table (
  user_id uuid,
  member_id text,
  full_name text,
  email text,
  total_checkins bigint,
  total_walkins bigint,
  total_overrides bigint,
  total_manual_entries bigint,
  total_missed_commitments bigint,
  total_count bigint
) language plpgsql security definer
set
  search_path = public as $$
declare
  v_offset integer;
  v_sundays date[];
begin
  -- Access check
  if not (
    public.is_admin_viewer()
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'Access denied: Requires admin viewer role';
  end if;

  -- Validate inputs
  if p_start_date > p_end_date then
    raise exception 'Start date cannot be after end date';
  end if;

  if p_page < 1 then
    p_page := 1;
  end if;
  if p_page_size < 1 or p_page_size > 100 then
    p_page_size := 50;
  end if;

  v_offset := (p_page - 1) * p_page_size;

  -- Pre-compute all Sundays in the date range
  select array(
    select d::date
    from generate_series(p_start_date, p_end_date, '1 day'::interval) d
    where extract(dow from d) = 0
  ) into v_sundays;

  return query
  with filtered_users as (
    select
      u.id as user_id,
      u.member_id,
      u.full_name,
      u.email,
      u.metadata
    from public.users u
    where (
      p_search_query is null
      or u.full_name ilike '%' || p_search_query || '%'
      or u.email ilike '%' || p_search_query || '%'
      or u.member_id ilike '%' || p_search_query || '%'
    )
    and u.is_active = true
  ),
  user_stats as (
    select
      fu.user_id,
      fu.member_id,
      fu.full_name,
      fu.email,
      count(sa.id) as total_checkins,
      count(sa.id) filter (where sa.is_walk_in = true) as total_walkins,
      count(sa.id) filter (where sa.is_override = true) as total_overrides,
      count(sa.id) filter (where sa.is_manual_entry = true) as total_manual_entries,
      (
        select count(*)
        from unnest(v_sundays) as s(sunday_date)
        cross join lateral (
          select extract(day from s.sunday_date)::integer / 7 + case when extract(day from s.sunday_date)::integer % 7 > 0 then 1 else 0 end as ordinal
        ) as ord
        cross join lateral (
          select case ord.ordinal
            when 1 then 'first_sunday'
            when 2 then 'second_sunday'
            when 3 then 'third_sunday'
            when 4 then 'fourth_sunday'
            else 'fifth_sunday'
          end as key
        ) as ckey
        where not exists (
          select 1 from public.service_exception_dates ed where ed.exception_date = s.sunday_date
        )
        and (
          -- They are committed on this specific Sunday
          coalesce(
            (select metadata->>ckey.key from public.user_commitment_history sub_ch where sub_ch.user_id = fu.user_id and sub_ch.effective_date <= s.sunday_date order by sub_ch.effective_date desc limit 1),
            fu.metadata->>ckey.key
          ) = 'true'
        )
        and not exists (
          -- They did not attend on this Sunday
          select 1
          from public.service_attendance a
          where a.user_id = fu.user_id
          and a.service_date = s.sunday_date
        )
      ) as total_missed_commitments
    from filtered_users fu
    left join public.service_attendance sa on sa.user_id = fu.user_id and sa.service_date >= p_start_date and sa.service_date <= p_end_date
    group by fu.user_id, fu.member_id, fu.full_name, fu.email, fu.metadata
  ),
  paginated_stats as (
    select *
    from user_stats
    order by full_name asc, member_id asc
    limit p_page_size
    offset v_offset
  ),
  total_count_query as (
    select count(*) as total_count from filtered_users
  )
  select
    ps.user_id,
    ps.member_id,
    ps.full_name,
    ps.email,
    ps.total_checkins,
    ps.total_walkins,
    ps.total_overrides,
    ps.total_manual_entries,
    ps.total_missed_commitments,
    tc.total_count
  from paginated_stats ps
  cross join total_count_query tc;

end;
$$;

revoke
execute on function public.get_member_service_attendance_stats (date, date, text, integer, integer)
from
  public,
  anon,
  authenticated;

grant
execute on function public.get_member_service_attendance_stats (date, date, text, integer, integer) to authenticated,
service_role;

commit;
