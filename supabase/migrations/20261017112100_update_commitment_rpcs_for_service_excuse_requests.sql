begin;

-- 1. Update get_commitment_dashboard_stats to query service_excuse_requests
create or replace function public.get_commitment_dashboard_stats (
  p_start_date date,
  p_end_date date,
  p_excuse_event_id uuid default null,
  p_search_query text default null,
  p_role text default null,
  p_category text default null,
  p_page integer default 1,
  p_page_size integer default 500
) returns table (
  user_id uuid,
  member_id text,
  avatar_object_key text,
  full_name text,
  nickname text,
  email text,
  role text,
  category text,
  start_date date,
  committed bigint,
  attended bigint,
  absences bigint,
  excused bigint,
  wi_9am_3pm bigint,
  wi_12nn bigint,
  wi_5th_sunday bigint,
  attendance_score numeric,
  total_count bigint
) language plpgsql security definer
set
  search_path = public as $$
declare
  v_offset integer;
  v_sundays date[];
begin
  -- Access check: admin viewers, service_role, or postgres/superuser callers
  if not (
    public.is_admin_viewer()
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'Access denied: Requires admin viewer role';
  end if;

  if p_start_date > p_end_date then
    raise exception 'Start date cannot be after end date';
  end if;

  if p_page < 1 then
    p_page := 1;
  end if;
  if p_page_size < 1 or p_page_size > 500 then
    p_page_size := 500;
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
      u.avatar_object_key,
      u.full_name,
      u.nickname,
      u.email,
      u.role as user_role,
      u.category as user_category,
      u.metadata,
      case
        when (u.metadata->>'start_date') ~ '^\d{4}-\d{2}-\d{2}' then
          substring(u.metadata->>'start_date' from '^\d{4}-\d{2}-\d{2}')::date
        else
          '2025-01-01'::date
      end as u_start_date
    from public.users u
    where u.is_active = true
      and (p_search_query is null or u.full_name ilike '%' || p_search_query || '%' or u.nickname ilike '%' || p_search_query || '%' or u.member_id ilike '%' || p_search_query || '%')
      and (
        p_role is null
        or p_role = ''
        or p_role = 'All Roles'
        or exists (
          select 1
          from unnest(string_to_array(p_role, ',')) as r(role_item)
          where u.role ilike '%' || trim(r.role_item) || '%'
        )
      )
      and (p_category is null or p_category = '' or p_category = 'All Categories' or u.category ilike '%' || p_category || '%')
  ),
  -- Excused users query logic using dedicated service_excuse_requests
  excused_requests as (
    select distinct
      ser.user_id,
      ser.request_date::text as request_date_str,
      array_to_string(ser.services, ', ') as services
    from public.service_excuse_requests ser
    where ser.status = 'approved'
  ),
  user_stats as (
    select
      fu.user_id,
      fu.member_id,
      fu.avatar_object_key,
      fu.full_name,
      fu.nickname,
      fu.email,
      fu.user_role,
      fu.user_category,
      fu.u_start_date as start_date,
      (
        select count(*)
        from unnest(v_sundays) as s(sunday_date)
        cross join (values ('9AM'), ('12NN'), ('3PM')) as ts(time_slot)
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
        where s.sunday_date <= (now() at time zone 'Asia/Manila')::date
          and s.sunday_date >= fu.u_start_date
          and not exists (
            select 1 from public.service_exception_dates ed where ed.exception_date = s.sunday_date
          )
          and coalesce(
          (select sub_ch.metadata from public.user_commitment_history sub_ch where sub_ch.user_id = fu.user_id and sub_ch.effective_date <= s.sunday_date order by sub_ch.effective_date desc limit 1),
          fu.metadata
        )->>ckey.key ilike ('%' || ts.time_slot || '%')
      ) as total_committed,
      (
        select count(sa.id)
        from public.service_attendance sa
        where sa.user_id = fu.user_id
          and sa.service_date >= p_start_date
          and sa.service_date <= p_end_date
          and sa.service_date >= fu.u_start_date
          and sa.is_walk_in = false
      ) as total_attended,
      (
        select count(*)
        from unnest(v_sundays) as s(sunday_date)
        cross join (values ('9AM'), ('12NN'), ('3PM')) as ts(time_slot)
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
        where s.sunday_date <= (now() at time zone 'Asia/Manila')::date
          and s.sunday_date >= fu.u_start_date
          and not exists (
            select 1 from public.service_exception_dates ed where ed.exception_date = s.sunday_date
          )
          and coalesce(
          (select sub_ch.metadata from public.user_commitment_history sub_ch where sub_ch.user_id = fu.user_id and sub_ch.effective_date <= s.sunday_date order by sub_ch.effective_date desc limit 1),
          fu.metadata
        )->>ckey.key ilike ('%' || ts.time_slot || '%')
        and not exists (
          select 1
          from public.service_attendance sa
          where sa.user_id = fu.user_id
            and sa.service_date = s.sunday_date
            and sa.time_slot = ts.time_slot
        )
        and not exists (
          select 1
          from excused_requests er
          where er.user_id = fu.user_id
            and er.request_date_str like (s.sunday_date::text || '%')
            and (er.services is null or trim(er.services) = '' or er.services ilike ('%' || ts.time_slot || '%') or er.services ilike '%all%')
        )
      ) as total_absences,
      (
        select count(*)
        from unnest(v_sundays) as s(sunday_date)
        cross join (values ('9AM'), ('12NN'), ('3PM')) as ts(time_slot)
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
        where s.sunday_date <= (now() at time zone 'Asia/Manila')::date
          and s.sunday_date >= fu.u_start_date
          and not exists (
            select 1 from public.service_exception_dates ed where ed.exception_date = s.sunday_date
          )
          and coalesce(
          (select sub_ch.metadata from public.user_commitment_history sub_ch where sub_ch.user_id = fu.user_id and sub_ch.effective_date <= s.sunday_date order by sub_ch.effective_date desc limit 1),
          fu.metadata
        )->>ckey.key ilike ('%' || ts.time_slot || '%')
        and not exists (
          select 1
          from public.service_attendance sa
          where sa.user_id = fu.user_id
            and sa.service_date = s.sunday_date
            and sa.time_slot = ts.time_slot
        )
        and exists (
          select 1
          from excused_requests er
          where er.user_id = fu.user_id
            and er.request_date_str like (s.sunday_date::text || '%')
            and (er.services is null or trim(er.services) = '' or er.services ilike ('%' || ts.time_slot || '%') or er.services ilike '%all%')
        )
      ) as total_excused,
      (
        select count(sa.id)
        from public.service_attendance sa
        where sa.user_id = fu.user_id
          and sa.service_date >= p_start_date
          and sa.service_date <= p_end_date
          and sa.service_date >= fu.u_start_date
          and sa.is_walk_in = true
          and sa.time_slot in ('9AM', '3PM')
          and extract(day from sa.service_date)::integer < 29
      ) as wi_9am_3pm,
      (
        select count(sa.id)
        from public.service_attendance sa
        where sa.user_id = fu.user_id
          and sa.service_date >= p_start_date
          and sa.service_date <= p_end_date
          and sa.service_date >= fu.u_start_date
          and sa.is_walk_in = true
          and sa.time_slot = '12NN'
          and extract(day from sa.service_date)::integer < 29
      ) as wi_12nn,
      (
        select count(sa.id)
        from public.service_attendance sa
        where sa.user_id = fu.user_id
          and sa.service_date >= p_start_date
          and sa.service_date <= p_end_date
          and sa.service_date >= fu.u_start_date
          and sa.is_walk_in = true
          and extract(day from sa.service_date)::integer >= 29
      ) as wi_5th_sunday
    from filtered_users fu
  )
  select
    us.user_id,
    us.member_id,
    us.avatar_object_key,
    us.full_name,
    us.nickname,
    us.email,
    us.user_role as role,
    us.user_category as category,
    us.start_date,
    us.total_committed as committed,
    us.total_attended as attended,
    us.total_absences as absences,
    us.total_excused as excused,
    us.wi_9am_3pm,
    us.wi_12nn,
    us.wi_5th_sunday,
    public.calculate_attendance_score(
      us.total_attended,
      us.total_absences,
      us.total_excused,
      us.wi_9am_3pm,
      us.wi_5th_sunday
    ) as attendance_score,
    count(*) over() as total_count
  from user_stats us
  order by us.full_name asc
  limit p_page_size
  offset v_offset;
end;
$$;

revoke
execute on function public.get_commitment_dashboard_stats (
  date,
  date,
  uuid,
  text,
  text,
  text,
  integer,
  integer
)
from
  public,
  anon;

grant
execute on function public.get_commitment_dashboard_stats (
  date,
  date,
  uuid,
  text,
  text,
  text,
  integer,
  integer
) to authenticated,
service_role;

-- 2. Update get_missed_service_commitments to query service_excuse_requests
create or replace function public.get_missed_service_commitments (
  p_year integer default null,
  p_month integer default null,
  p_sunday_date date default null,
  p_start_date date default null,
  p_end_date date default null,
  p_time_slot text default null,
  p_role text default null,
  p_excuse_event_id uuid default null,
  p_search_query text default null
) returns table (
  user_id uuid,
  member_id text,
  full_name text,
  nickname text,
  role text,
  phone text,
  avatar_object_key text,
  service_date date,
  time_slot text,
  status text,
  category text
) language plpgsql security definer
set
  search_path = public as $$
declare
  v_start_date date;
  v_end_date date;
  v_sundays date[];
  v_today date;
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
  if p_start_date is not null and p_end_date is not null then
    v_start_date := p_start_date;
    v_end_date := p_end_date;
  elsif p_sunday_date is not null then
    v_start_date := p_sunday_date;
    v_end_date := p_sunday_date;
  elsif p_year is not null and p_month is not null then
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := (v_start_date + interval '1 month' - interval '1 day')::date;
  elsif p_year is not null then
    v_start_date := make_date(p_year, 1, 1);
    v_end_date := make_date(p_year, 12, 31);
  else
    raise exception 'Must provide a valid date range, year, or specific sunday date';
  end if;

  v_today := (now() at time zone 'Asia/Manila')::date;

  -- Ensure we only consider Sundays up to today that are not exception dates
  select array_agg(d::date order by d::date desc) into v_sundays
  from generate_series(v_start_date, v_end_date, '1 day'::interval) d
  where extract(dow from d) = 0
    and d::date <= v_today
    and not exists (
      select 1 from public.service_exception_dates ed where ed.exception_date = d::date
    );

  if v_sundays is null or coalesce(array_length(v_sundays, 1), 0) = 0 then
    return;
  end if;

  return query
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
  target_slots as (
    select ts.time_slot
    from (values ('9AM'), ('12NN'), ('3PM')) as ts(time_slot)
    where p_time_slot is null or p_time_slot = '' or p_time_slot = 'All' or ts.time_slot = p_time_slot
  ),
  excused_requests as (
    select distinct
      ser.user_id,
      ser.request_date::text as request_date_str,
      array_to_string(ser.services, ', ') as services
    from public.service_excuse_requests ser
    where ser.status = 'approved'
  ),
  filtered_users as (
    select
      u.id as user_id,
      u.member_id,
      u.full_name,
      u.nickname,
      split_part(coalesce(nullif(trim(u.role), ''), u.metadata->>'role'), '/', 1) as primary_role,
      u.phone,
      u.avatar_object_key,
      u.category,
      u.metadata,
      case
        when (u.metadata->>'start_date') ~ '^\d{4}-\d{2}-\d{2}' then
          substring(u.metadata->>'start_date' from '^\d{4}-\d{2}-\d{2}')::date
        else
          '2025-01-01'::date
      end as u_start_date
    from public.users u
    where u.is_active = true
      and (
        p_search_query is null
        or p_search_query = ''
        or u.full_name ilike '%' || p_search_query || '%'
        or u.nickname ilike '%' || p_search_query || '%'
        or u.member_id ilike '%' || p_search_query || '%'
        or coalesce(u.phone, '') ilike '%' || p_search_query || '%'
      )
  )
  select
    fu.user_id,
    fu.member_id,
    fu.full_name,
    fu.nickname,
    trim(fu.primary_role) as role,
    fu.phone,
    fu.avatar_object_key,
    es.sunday_date as service_date,
    ts.time_slot,
    case
      when exists (
        select 1
        from excused_requests er
        where er.user_id = fu.user_id
          and er.request_date_str like (es.sunday_date::text || '%')
          and (er.services is null or trim(er.services) = '' or er.services ilike ('%' || ts.time_slot || '%') or er.services ilike '%all%')
      ) then 'excused'::text
      else 'absent'::text
    end as status,
    fu.category
  from expanded_sundays es
  cross join target_slots ts
  cross join filtered_users fu
  where es.sunday_date >= fu.u_start_date
    and (
      p_role is null
      or p_role = ''
      or p_role = 'All Roles'
      or fu.primary_role ilike '%' || trim(p_role) || '%'
    )
    and (
      coalesce(
        (select metadata->>es.ckey from public.user_commitment_history sub_ch where sub_ch.user_id = fu.user_id and sub_ch.effective_date <= es.sunday_date order by sub_ch.effective_date desc limit 1),
        fu.metadata->>es.ckey
      ) ilike '%' || ts.time_slot || '%'
    )
    and not exists (
      select 1
      from public.service_attendance sa
      where sa.user_id = fu.user_id
        and sa.service_date = es.sunday_date
        and sa.time_slot = ts.time_slot
    )
  order by es.sunday_date desc, ts.time_slot asc, fu.full_name asc;
end;
$$;

revoke
execute on function public.get_missed_service_commitments (
  integer,
  integer,
  date,
  date,
  date,
  text,
  text,
  uuid,
  text
)
from
  public,
  anon;

grant
execute on function public.get_missed_service_commitments (
  integer,
  integer,
  date,
  date,
  date,
  text,
  text,
  uuid,
  text
) to authenticated,
service_role;

-- 3. Update get_volunteer_attendance_log to query service_excuse_requests
create or replace function public.get_volunteer_attendance_log (
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
  p_excuse_event_id uuid default null
) returns table (
  id uuid,
  service_date date,
  time_slot text,
  is_walk_in boolean,
  is_override boolean,
  is_manual_entry boolean,
  status text,
  checked_in_at timestamptz
) language plpgsql security definer
set
  search_path = public as $$
declare
  v_sundays date[];
  v_user_start_date date;
  v_user_metadata jsonb;
  v_today date;
begin
  -- Access check: admin viewers, service_role, or postgres/superuser callers
  if not (
    public.is_admin_viewer()
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'Access denied: Requires admin viewer role';
  end if;

  if p_start_date > p_end_date then
    raise exception 'Start date cannot be after end date';
  end if;

  -- Get target user metadata and start_date
  select
    case
      when (u.metadata->>'start_date') ~ '^\d{4}-\d{2}-\d{2}' then
        substring(u.metadata->>'start_date' from '^\d{4}-\d{2}-\d{2}')::date
      else
        '2025-01-01'::date
      end,
    u.metadata
  into v_user_start_date, v_user_metadata
  from public.users u
  where u.id = p_user_id;

  if v_user_start_date is null then
    return;
  end if;

  v_today := (now() at time zone 'Asia/Manila')::date;

  -- Pre-compute all Sundays in the date range
  select array(
    select d::date
    from generate_series(p_start_date, p_end_date, '1 day'::interval) d
    where extract(dow from d) = 0
  ) into v_sundays;

  return query
  with excused_requests as (
    select distinct
      ser.user_id,
      ser.request_date::text as request_date_str,
      array_to_string(ser.services, ', ') as services
    from public.service_excuse_requests ser
    where ser.user_id = p_user_id
      and ser.status = 'approved'
  ),
  actual_attendance as (
    select
      sa.id,
      sa.service_date,
      sa.time_slot,
      sa.is_walk_in,
      sa.is_override,
      sa.is_manual_entry,
      'present'::text as status,
      sa.checked_in_at
    from public.service_attendance sa
    where sa.user_id = p_user_id
      and sa.service_date >= p_start_date
      and sa.service_date <= p_end_date
  ),
  inferred_missed as (
    select
      null::uuid as id,
      s.sunday_date as service_date,
      ts.time_slot,
      false as is_walk_in,
      false as is_override,
      false as is_manual_entry,
      case
        when exists (
          select 1
          from excused_requests er
          where er.request_date_str like (s.sunday_date::text || '%')
            and (er.services is null or trim(er.services) = '' or er.services ilike ('%' || ts.time_slot || '%') or er.services ilike '%all%')
        ) then 'excused'::text
        else 'absent'::text
      end as status,
      null::timestamptz as checked_in_at
    from unnest(v_sundays) as s(sunday_date)
    cross join (values ('9AM'), ('12NN'), ('3PM')) as ts(time_slot)
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
    where s.sunday_date <= v_today
      and s.sunday_date >= v_user_start_date
      and not exists (
        select 1 from public.service_exception_dates ed where ed.exception_date = s.sunday_date
      )
      and coalesce(
        (select sub_ch.metadata from public.user_commitment_history sub_ch where sub_ch.user_id = p_user_id and sub_ch.effective_date <= s.sunday_date order by sub_ch.effective_date desc limit 1),
        v_user_metadata
      )->>ckey.key ilike ('%' || ts.time_slot || '%')
      and not exists (
        select 1
        from public.service_attendance sa
        where sa.user_id = p_user_id
          and sa.service_date = s.sunday_date
          and sa.time_slot = ts.time_slot
      )
  )
  select * from actual_attendance
  union all
  select * from inferred_missed
  order by service_date desc, time_slot asc;
end;
$$;

revoke
execute on function public.get_volunteer_attendance_log (uuid, date, date, uuid)
from
  public,
  anon;

grant
execute on function public.get_volunteer_attendance_log (uuid, date, date, uuid) to authenticated,
service_role;

commit;
