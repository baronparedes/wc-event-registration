begin;

-- 1. Update get_commitment_dashboard_stats to allow service_role access
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
  -- Excused users query logic
  excused_requests as (
    select distinct
      r.user_id,
      coalesce(ra_date.answer_text, cast(ra_date.answer_date as text)) as request_date_str,
      ra_serv.answer_text as services
    from public.registrations r
    join public.registration_answers ra_date on ra_date.registration_id = r.id
    join public.event_fields ef_date on ef_date.id = ra_date.event_field_id and ef_date.field_key = 'request_date'
    left join public.registration_answers ra_serv on ra_serv.registration_id = r.id
    left join public.event_fields ef_serv on ef_serv.id = ra_serv.event_field_id and ef_serv.field_key = 'services'
    where (p_excuse_event_id is null or r.event_id = p_excuse_event_id)
      and r.status != 'cancelled'
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
  ),
  scored_users as (
    select
      us.user_id,
      us.member_id,
      us.avatar_object_key,
      us.full_name,
      us.nickname,
      us.email,
      us.user_role,
      us.user_category,
      us.start_date,
      us.total_committed,
      us.total_attended,
      us.total_absences,
      us.total_excused,
      us.wi_9am_3pm,
      us.wi_12nn,
      us.wi_5th_sunday,
      public.calculate_attendance_score(
        us.total_attended,
        us.total_absences,
        us.total_excused,
        us.wi_9am_3pm,
        us.wi_5th_sunday
      ) as attendance_score
    from user_stats us
  ),
  total_count_query as (
    select count(*) as tc from filtered_users
  )
  select
    su.user_id,
    su.member_id,
    su.avatar_object_key,
    su.full_name,
    su.nickname,
    su.email,
    su.user_role as role,
    su.user_category as category,
    su.start_date,
    su.total_committed as committed,
    su.total_attended as attended,
    su.total_absences as absences,
    su.total_excused as excused,
    su.wi_9am_3pm,
    su.wi_12nn,
    su.wi_5th_sunday,
    su.attendance_score,
    tcq.tc as total_count
  from scored_users su
  cross join total_count_query tcq
  order by su.attendance_score desc, su.full_name asc, su.member_id asc
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
  anon,
  authenticated;

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

-- 2. Update get_volunteer_attendance_log to allow service_role access
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
      r.user_id,
      coalesce(ra_date.answer_text, cast(ra_date.answer_date as text)) as request_date_str,
      ra_serv.answer_text as services
    from public.registrations r
    join public.registration_answers ra_date on ra_date.registration_id = r.id
    join public.event_fields ef_date on ef_date.id = ra_date.event_field_id and ef_date.field_key = 'request_date'
    left join public.registration_answers ra_serv on ra_serv.registration_id = r.id
    left join public.event_fields ef_serv on ef_serv.id = ra_serv.event_field_id and ef_serv.field_key = 'services'
    where r.user_id = p_user_id
      and (p_excuse_event_id is null or r.event_id = p_excuse_event_id)
      and r.status != 'cancelled'
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
  anon,
  authenticated;

grant
execute on function public.get_volunteer_attendance_log (uuid, date, date, uuid) to authenticated,
service_role;

commit;
