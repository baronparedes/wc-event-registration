begin;

-- 1. Create or replace public.service_excuse_sundays view with (security_invoker = true)
-- Expands single-date and date-range excuse requests for 'approved' and 'pending' statuses into Sunday dates.
create or replace view public.service_excuse_sundays
with
  (security_invoker = true) as
select distinct
  ser.id as excuse_id,
  ser.user_id,
  ser.member_id,
  s.sunday_date,
  s.sunday_date::text as request_date_str,
  ser.services,
  array_to_string(ser.services, ', ') as services_str,
  ser.reason,
  ser.status,
  ser.is_long_leave
from
  public.service_excuse_requests ser
  cross join lateral (
    select
      (
        coalesce(ser.start_date, ser.request_date) + interval '1 day' * i
      )::date as sunday_date
    from
      generate_series(
        0,
        greatest(
          0,
          (
            coalesce(ser.end_date, ser.start_date, ser.request_date) - coalesce(ser.start_date, ser.request_date)
          )
        )
      ) as i
    where
      extract(
        dow
        from
          (
            coalesce(ser.start_date, ser.request_date) + interval '1 day' * i
          )
      ) = 0
  ) s
where
  ser.status in ('approved', 'pending');

grant
select
  on public.service_excuse_sundays to authenticated,
  service_role;

-- 2. Update public.approved_service_excuse_sundays view to filter from service_excuse_sundays
create or replace view public.approved_service_excuse_sundays
with
  (security_invoker = true) as
select
  excuse_id,
  user_id,
  member_id,
  sunday_date,
  request_date_str,
  services,
  services_str,
  reason,
  status,
  is_long_leave
from
  public.service_excuse_sundays
where
  status = 'approved';

grant
select
  on public.approved_service_excuse_sundays to authenticated,
  service_role;

-- 3. Update get_volunteer_attendance_log to support future Sundays and pending excuses
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
      ses.user_id,
      ses.sunday_date,
      ses.services_str as services,
      ses.status as excuse_status
    from public.service_excuse_sundays ses
    where ses.user_id = p_user_id
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
  inferred_committed as (
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
          where er.sunday_date = s.sunday_date
            and er.excuse_status = 'approved'
            and (er.services is null or trim(er.services) = '' or er.services ilike ('%' || ts.time_slot || '%') or er.services ilike '%all%')
        ) then 'excused'::text
        when exists (
          select 1
          from excused_requests er
          where er.sunday_date = s.sunday_date
            and er.excuse_status = 'pending'
            and (er.services is null or trim(er.services) = '' or er.services ilike ('%' || ts.time_slot || '%') or er.services ilike '%all%')
        ) then 'pending_excusal'::text
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
    where s.sunday_date >= v_user_start_date
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
      -- For past dates (<= today), include all uncheck-in committed slots (absent, excused, pending)
      -- For future dates (> today), ONLY include if there is an approved or pending excuse request
      and (
        s.sunday_date <= v_today
        or exists (
          select 1
          from excused_requests er
          where er.sunday_date = s.sunday_date
            and (er.services is null or trim(er.services) = '' or er.services ilike ('%' || ts.time_slot || '%') or er.services ilike '%all%')
        )
      )
  )
  select * from actual_attendance
  union all
  select * from inferred_committed
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

-- 4. Update get_commitment_dashboard_stats to query approved_service_excuse_sundays
create or replace function public.get_commitment_dashboard_stats (
  p_start_date date,
  p_end_date date,
  p_search text default null,
  p_role text default null,
  p_category text default null,
  p_limit integer default 20,
  p_offset integer default 0
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
  committed integer,
  attended integer,
  excused integer,
  absent integer,
  attendance_rate numeric,
  attendance_score numeric,
  total_count bigint
) language plpgsql security definer
set
  search_path = public as $$
declare
  v_sundays date[];
begin
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
      coalesce(u.metadata->>'nickname', '') as nickname,
      u.email,
      coalesce(u.role, 'Member') as user_role,
      coalesce(u.category, 'General') as user_category,
      case
        when (u.metadata->>'start_date') ~ '^\d{4}-\d{2}-\d{2}' then
          substring(u.metadata->>'start_date' from '^\d{4}-\d{2}-\d{2}')::date
        else
          '2025-01-01'::date
      end as u_start_date,
      u.metadata
    from public.users u
    where
      (
        p_search is null
        or p_search = ''
        or u.full_name ilike '%' || p_search || '%'
        or u.email ilike '%' || p_search || '%'
        or coalesce(u.metadata->>'nickname', '') ilike '%' || p_search || '%'
        or coalesce(u.member_id, '') ilike '%' || p_search || '%'
      )
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
  excused_requests as (
    select distinct
      aes.user_id,
      aes.sunday_date,
      aes.services_str as services
    from public.approved_service_excuse_sundays aes
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
          and exists (
            select 1
            from excused_requests er
            where er.user_id = fu.user_id
              and er.sunday_date = s.sunday_date
              and (er.services is null or trim(er.services) = '' or er.services ilike ('%' || ts.time_slot || '%') or er.services ilike '%all%')
          )
      ) as total_excused,
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
              and er.sunday_date = s.sunday_date
              and (er.services is null or trim(er.services) = '' or er.services ilike ('%' || ts.time_slot || '%') or er.services ilike '%all%')
          )
      ) as total_missed,
      (
        select count(sa.id)
        from public.service_attendance sa
        where sa.user_id = fu.user_id
          and sa.service_date >= p_start_date
          and sa.service_date <= p_end_date
          and sa.service_date >= fu.u_start_date
          and sa.is_walk_in = true
          and extract(day from sa.service_date)::integer < 29
          and sa.time_slot in ('9AM', '3PM')
      ) as walkin_9_or_3,
      (
        select count(sa.id)
        from public.service_attendance sa
        where sa.user_id = fu.user_id
          and sa.service_date >= p_start_date
          and sa.service_date <= p_end_date
          and sa.service_date >= fu.u_start_date
          and sa.is_walk_in = true
          and extract(day from sa.service_date)::integer >= 29
      ) as walkin_5th_sun,
      count(*) over() as full_count
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
    us.total_committed::integer as committed,
    us.total_attended::integer as attended,
    us.total_excused::integer as excused,
    us.total_missed::integer as absent,
    case
      when us.total_committed > 0 then
        round((us.total_attended::numeric / us.total_committed::numeric) * 100, 1)
      else 0.0
    end as attendance_rate,
    round(
      (
        (us.total_attended::numeric * 1.5)
        - (us.total_missed::numeric * 1.0)
        - (us.total_excused::numeric * 0.5)
        + (us.walkin_9_or_3::numeric * 0.5)
        + (us.walkin_5th_sun::numeric * 1.5)
      ),
      1
    ) as attendance_score,
    us.full_count as total_count
  from user_stats us
  order by us.full_name asc
  limit p_limit offset p_offset;
end;
$$;

revoke
execute on function public.get_commitment_dashboard_stats (date, date, text, text, text, integer, integer)
from
  public,
  anon;

grant
execute on function public.get_commitment_dashboard_stats (date, date, text, text, text, integer, integer) to authenticated,
service_role;

-- 5. Update get_missed_service_commitments to query approved_service_excuse_sundays
create or replace function public.get_missed_service_commitments (
  p_start_date date,
  p_end_date date,
  p_search text default null,
  p_role text default null
) returns table (
  user_id uuid,
  member_id text,
  avatar_object_key text,
  full_name text,
  nickname text,
  email text,
  role text,
  category text,
  service_date date,
  time_slot text,
  status text
) language plpgsql security definer
set
  search_path = public as $$
declare
  v_sundays date[];
  v_today date;
begin
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

  v_today := (now() at time zone 'Asia/Manila')::date;

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
      coalesce(u.metadata->>'nickname', '') as nickname,
      u.email,
      coalesce(u.role, 'Member') as user_role,
      coalesce(u.category, 'General') as user_category,
      case
        when (u.metadata->>'start_date') ~ '^\d{4}-\d{2}-\d{2}' then
          substring(u.metadata->>'start_date' from '^\d{4}-\d{2}-\d{2}')::date
        else
          '2025-01-01'::date
      end as u_start_date,
      u.metadata
    from public.users u
    where
      (
        p_search is null
        or p_search = ''
        or u.full_name ilike '%' || p_search || '%'
        or u.email ilike '%' || p_search || '%'
        or coalesce(u.metadata->>'nickname', '') ilike '%' || p_search || '%'
        or coalesce(u.member_id, '') ilike '%' || p_search || '%'
      )
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
  )
  select
    fu.user_id,
    fu.member_id,
    fu.avatar_object_key,
    fu.full_name,
    fu.nickname,
    fu.email,
    fu.user_role as role,
    fu.user_category as category,
    s.sunday_date as service_date,
    ts.time_slot,
    case
      when exists (
        select 1
        from public.approved_service_excuse_sundays aes
        where aes.user_id = fu.user_id
          and aes.sunday_date = s.sunday_date
          and (
            aes.services is null
            or trim(array_to_string(aes.services, '')) = ''
            or aes.services_str ilike ('%' || ts.time_slot || '%')
            or aes.services_str ilike '%all%'
          )
      ) then 'excused'::text
      else 'absent'::text
    end as status
  from filtered_users fu
  cross join unnest(v_sundays) as s(sunday_date)
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
  order by s.sunday_date desc, fu.full_name asc;
end;
$$;

revoke
execute on function public.get_missed_service_commitments (date, date, text, text)
from
  public,
  anon;

grant
execute on function public.get_missed_service_commitments (date, date, text, text) to authenticated,
service_role;

commit;
