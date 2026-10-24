-- ==============================================================================
-- Validation Script: DGroup (Discipleship Group) Metadata
-- Description:
--   Identifies users who do NOT have any DGroup data in their metadata,
--   including checks across common key variations (dgroup_leader, dgroup_status,
--   dgroup_member_since, etc.).
-- ==============================================================================
-- ------------------------------------------------------------------------------
-- 1. OVERALL METRIC SUMMARY (At a glance)
-- ------------------------------------------------------------------------------
with
  dgroup_evaluated as (
    select
      u.id,
      u.is_active,
      exists (
        select
          1
        from
          jsonb_each_text(u.metadata) as kv (key, val)
        where
          lower(replace(replace(key, '_', ''), ' ', '')) like 'dgroup%'
          and nullif(trim(val), '') is not null
      ) as has_dgroup
    from
      public.users u
  )
select
  count(*) as total_users,
  count(*) filter (
    where
      is_active = true
  ) as total_active_users,
  -- Users with DGroup data
  count(*) filter (
    where
      has_dgroup = true
  ) as users_with_dgroup,
  count(*) filter (
    where
      is_active = true
      and has_dgroup = true
  ) as active_users_with_dgroup,
  -- Users without DGroup data
  count(*) filter (
    where
      has_dgroup = false
  ) as users_missing_dgroup,
  count(*) filter (
    where
      is_active = true
      and has_dgroup = false
  ) as active_users_missing_dgroup
from
  dgroup_evaluated;

-- ------------------------------------------------------------------------------
-- 2. USERS WHO DO NOT HAVE DGROUP DATA
-- Lists all users who have NO DGroup metadata fields populated.
-- ------------------------------------------------------------------------------
select
  u.id,
  u.member_id,
  u.full_name,
  u.email,
  u.phone,
  u.is_active,
  u.created_at
from
  public.users u
where
  not exists (
    select
      1
    from
      jsonb_each_text(u.metadata) as kv (key, val)
    where
      lower(replace(replace(key, '_', ''), ' ', '')) like 'dgroup%'
      and nullif(trim(val), '') is not null
  )
order by
  u.is_active desc,
  u.full_name asc;

-- ------------------------------------------------------------------------------
-- 3. USERS WITH NO_DGROUP_DATA ONLY (Detailed field inspection)
-- Shows users missing DGroup data alongside their extracted DGroup fields (all null/blank).
-- ------------------------------------------------------------------------------
select
  u.id,
  u.member_id,
  u.full_name,
  u.email,
  u.phone,
  u.is_active,
  coalesce(
    u.metadata ->> 'dgroup_leader',
    u.metadata ->> 'dgroupleader',
    u.metadata ->> 'd_group_leader',
    u.metadata ->> 'DGroup Leader'
  ) as dgroup_leader,
  coalesce(
    u.metadata ->> 'dgroup_status',
    u.metadata ->> 'dgroupstatus',
    u.metadata ->> 'd_group_status',
    u.metadata ->> 'DGroup Status'
  ) as dgroup_status,
  coalesce(
    u.metadata ->> 'dgroup_member_since',
    u.metadata ->> 'dgroupmembersince',
    u.metadata ->> 'dgroupmember since',
    u.metadata ->> 'd_group_member_since',
    u.metadata ->> 'DGroup Member Since'
  ) as dgroup_member_since,
  'NO_DGROUP_DATA' as dgroup_data_status
from
  public.users u
where
  not exists (
    select
      1
    from
      jsonb_each_text(u.metadata) as kv (key, val)
    where
      lower(replace(replace(key, '_', ''), ' ', '')) like 'dgroup%'
      and nullif(trim(val), '') is not null
  )
order by
  u.is_active desc,
  u.full_name asc;
