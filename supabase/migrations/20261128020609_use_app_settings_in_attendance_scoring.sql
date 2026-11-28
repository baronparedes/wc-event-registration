begin;

-- Update calculate_attendance_score to read weights from public.app_settings ('attendance_scoring_weights')
create or replace function public.calculate_attendance_score (
  p_attended numeric,
  p_absences numeric,
  p_excused numeric,
  p_wi_9am_3pm numeric,
  p_wi_5th_sunday numeric default 0
) returns numeric language plpgsql security definer stable
set
  search_path = public as $$
declare
  v_weights jsonb;
  v_w_attended numeric := 1.0;
  v_w_absence numeric := -1.0;
  v_w_excused numeric := -0.5;
  v_w_wi_9am_3pm numeric := 0.5;
  v_w_wi_5th_sunday numeric := 1.0;
begin
  select s.value
  into v_weights
  from public.app_settings s
  where s.key = 'attendance_scoring_weights';

  if v_weights is not null then
    v_w_attended := coalesce((v_weights->>'attended')::numeric, v_w_attended);
    v_w_absence := coalesce((v_weights->>'absence')::numeric, v_w_absence);
    v_w_excused := coalesce((v_weights->>'excused')::numeric, v_w_excused);
    v_w_wi_9am_3pm := coalesce((v_weights->>'walk_in_9am_3pm')::numeric, v_w_wi_9am_3pm);
    v_w_wi_5th_sunday := coalesce((v_weights->>'walk_in_5th_sunday')::numeric, v_w_wi_5th_sunday);
  end if;

  return (coalesce(p_attended, 0) * v_w_attended)
       + (coalesce(p_absences, 0) * v_w_absence)
       + (coalesce(p_excused, 0) * v_w_excused)
       + (coalesce(p_wi_9am_3pm, 0) * v_w_wi_9am_3pm)
       + (coalesce(p_wi_5th_sunday, 0) * v_w_wi_5th_sunday);
end;
$$;

revoke
execute on function public.calculate_attendance_score (numeric, numeric, numeric, numeric, numeric)
from
  public,
  anon;

grant
execute on function public.calculate_attendance_score (numeric, numeric, numeric, numeric, numeric) to authenticated,
service_role;

-- Update get_commitment_dashboard_stats to delegate attendance_score to public.calculate_attendance_score
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
      public.calculate_attendance_score(
        us.total_attended::numeric,
        us.total_missed::numeric,
        us.total_excused::numeric,
        us.walkin_9_or_3::numeric,
        us.walkin_5th_sun::numeric
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

commit;
