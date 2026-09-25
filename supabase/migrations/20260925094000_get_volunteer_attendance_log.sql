begin;

-- Drop previous function signatures
drop function if exists public.get_volunteer_attendance_log (uuid, date, date);

drop function if exists public.get_volunteer_attendance_log (uuid, date, date, uuid);

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
  status text
) language plpgsql security definer
set
  search_path = public as $$
declare
  v_sundays date[];
  v_user_start_date date;
  v_user_metadata jsonb;
  v_today date;
begin
  -- Access check
  if not public.is_admin_viewer() then
    raise exception 'Access denied: Requires admin viewer role';
  end if;

  if p_start_date > p_end_date then
    raise exception 'Start date cannot be after end date';
  end if;

  -- Get target user metadata and start_date
  select
    case
      when (u.metadata->>'timestamp') ~ '^\d{4}-\d{2}-\d{2}' then
        substring(u.metadata->>'timestamp' from '^\d{4}-\d{2}-\d{2}')::date
      else
        u.created_at::date
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
      'present'::text as status
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
      end as status
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
