-- Local-only fixtures should live in supabase/seeds/*.local.sql, which are ignored from git and only applied in local environments.
-- Base service layout with tables 1 to 100
do $$
declare
  v_layout_id uuid;
begin
  -- 1. Find existing 'Base Layout' or insert a new one
  select id into v_layout_id
  from public.service_layouts
  where lower(description) = lower('Base Layout')
  order by created_at desc
  limit 1;

  if v_layout_id is null then
    insert into public.service_layouts (description, is_active)
    select 'Base Layout', true
    where not exists (
      select 1
      from public.service_layouts
      where lower(description) = lower('Base Layout')
    )
    on conflict (lower(description)) do nothing
    returning id into v_layout_id;

    if v_layout_id is null then
      select id into v_layout_id
      from public.service_layouts
      where lower(description) = lower('Base Layout')
      order by created_at desc
      limit 1;
    end if;
  end if;

  -- 2. Insert tables '1' through '100' (skipping any that already exist for this layout)
  insert into public.service_seats (layout_id, table_number)
  select
    v_layout_id,
    s.table_num::text
  from generate_series(1, 100) as s(table_num)
  where not exists (
    select 1
    from public.service_seats existing
    where existing.layout_id = v_layout_id
      and existing.table_number = s.table_num::text
  );

  -- 3. Insert generic 'Usher / Backroom / IMT / VMT' entry
  insert into public.service_seats (layout_id, table_number)
  select
    v_layout_id,
    'Usher / Backroom / IMT / VMT'
  where not exists (
    select 1
    from public.service_seats existing
    where existing.layout_id = v_layout_id
      and existing.table_number = 'Usher / Backroom / IMT / VMT'
  );

  -- 4. Insert generic 'Unassigned' entry
  insert into public.service_seats (layout_id, table_number)
  select
    v_layout_id,
    'Unassigned'
  where not exists (
    select 1
    from public.service_seats existing
    where existing.layout_id = v_layout_id
      and existing.table_number = 'Unassigned'
  );
end $$;

-- Populate service_excuse_requests from seeded historical excuse registrations
insert into
  public.service_excuse_requests (
    user_id,
    member_id,
    request_date,
    services,
    reason,
    status,
    created_at
  )
select distinct
  on (r.id) r.user_id,
  u.member_id,
  coalesce(
    ra_date.answer_date,
    case
      when ra_date.answer_text ~ '^\d{4}-\d{2}-\d{2}' then substring(
        ra_date.answer_text
        from
          1 for 10
      )::date
      else null
    end
  ) as request_date,
  case
    when ra_serv.answer_text is null
    or trim(ra_serv.answer_text) = '' then array['All Services']::text[]
    else string_to_array(
      replace(replace(ra_serv.answer_text, '[', ''), ']', ''),
      ', '
    )
  end as services,
  ra_reason.answer_text as reason,
  case
    when r.status = 'cancelled' then 'cancelled'
    else 'approved'
  end as status,
  r.created_at
from
  public.registrations r
  join public.users u on u.id = r.user_id
  join public.events e on e.id = r.event_id
  and (
    e.slug ilike '%excuse%'
    or e.title ilike '%excuse%'
  )
  join public.event_fields ef_date on ef_date.event_id = r.event_id
  and ef_date.field_key = 'request_date'
  join public.registration_answers ra_date on ra_date.registration_id = r.id
  and ra_date.event_field_id = ef_date.id
  left join public.event_fields ef_serv on ef_serv.event_id = r.event_id
  and ef_serv.field_key = 'services'
  left join public.registration_answers ra_serv on ra_serv.registration_id = r.id
  and ra_serv.event_field_id = ef_serv.id
  left join public.event_fields ef_reason on ef_reason.event_id = r.event_id
  and ef_reason.field_key = 'reason'
  left join public.registration_answers ra_reason on ra_reason.registration_id = r.id
  and ra_reason.event_field_id = ef_reason.id
where
  coalesce(
    ra_date.answer_date,
    case
      when ra_date.answer_text ~ '^\d{4}-\d{2}-\d{2}' then substring(
        ra_date.answer_text
        from
          1 for 10
      )::date
      else null
    end
  ) is not null
on conflict do nothing;
