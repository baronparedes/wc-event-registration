begin;

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
  attendance_score numeric,
  total_count bigint
) language plpgsql security definer
set
  search_path = public as $$
declare
  v_offset integer;
  v_sundays date[];
begin
  -- Access check
  if not public.is_admin_viewer() then
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
      u.full_name,
      u.nickname,
      u.email,
      u.role as user_role,
      u.category as user_category,
      u.metadata,
      case
        when (u.metadata->>'timestamp') ~ '^\d{4}-\d{2}-\d{2}' then
          substring(u.metadata->>'timestamp' from '^\d{4}-\d{2}-\d{2}')::date
        else
          u.created_at::date
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
        where s.sunday_date >= fu.u_start_date
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
      ) as wi_12nn
    from filtered_users fu
  ),
  scored_users as (
    select
      us.user_id,
      us.member_id,
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
      -- Score formula:
      -- Committed with Checkin (+1) = total_attended
      -- Committed No Checkin (-1) = total_absences
      -- Committed No Checkin w Excused (-0.5) = total_excused
      -- Uncommitted WalkedIn (+0.5 for 9AM/3PM only) = wi_9am_3pm
      -- Total: total_attended(1.0) - total_absences(1.0) - (total_excused * 0.5) + (wi_9am_3pm * 0.5)
      (
        cast(us.total_attended as numeric)
        - cast(us.total_absences as numeric)
        - (cast(us.total_excused as numeric) * 0.5)
        + (cast(us.wi_9am_3pm as numeric) * 0.5)
      ) as attendance_score
    from user_stats us
  ),
  total_count_query as (
    select count(*) as tc from filtered_users
  )
  select
    su.user_id,
    su.member_id,
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

commit;
