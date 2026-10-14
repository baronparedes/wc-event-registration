begin;

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
  anon,
  authenticated;

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

commit;
