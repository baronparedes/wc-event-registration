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
