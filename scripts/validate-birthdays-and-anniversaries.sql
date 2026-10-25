-- ==============================================================================
-- Validation Script: Birthdays & Wedding Anniversaries
-- Description:
--   1. Identifies users who are missing `date_of_birth`.
--   2. Identifies married users (civil_status = 'married' in metadata) and checks
--      if they have a `wedanniv_date` in metadata (and what value it has).
--   3. Provides summary counts and targeted inspection lists.
-- ==============================================================================
-- ------------------------------------------------------------------------------
-- 1. OVERALL METRIC SUMMARY (At a glance)
-- ------------------------------------------------------------------------------
select
  count(*) as total_users,
  count(*) filter (
    where
      is_active = true
  ) as total_active_users,
  -- Birthday metrics
  count(*) filter (
    where
      date_of_birth is not null
  ) as users_with_dob,
  count(*) filter (
    where
      date_of_birth is null
  ) as users_missing_dob,
  -- Civil status & Wedding anniversary metrics
  count(*) filter (
    where
      lower(
        trim(
          coalesce(
            metadata ->> 'civil_status',
            metadata ->> 'civilstatus',
            metadata ->> 'Civil Status',
            ''
          )
        )
      ) = 'married'
  ) as total_married_users,
  count(*) filter (
    where
      lower(
        trim(
          coalesce(
            metadata ->> 'civil_status',
            metadata ->> 'civilstatus',
            metadata ->> 'Civil Status',
            ''
          )
        )
      ) = 'married'
      and nullif(trim(metadata ->> 'wedanniv_date'), '') is not null
  ) as married_with_anniversary,
  count(*) filter (
    where
      lower(
        trim(
          coalesce(
            metadata ->> 'civil_status',
            metadata ->> 'civilstatus',
            metadata ->> 'Civil Status',
            ''
          )
        )
      ) = 'married'
      and nullif(trim(metadata ->> 'wedanniv_date'), '') is null
  ) as married_missing_anniversary
from
  public.users;

-- ------------------------------------------------------------------------------
-- 2. USERS MISSING `date_of_birth`
-- Includes legacy metadata dob_month / dob_day if present.
-- ------------------------------------------------------------------------------
select
  id,
  member_id,
  full_name,
  email,
  phone,
  is_active,
  date_of_birth,
  metadata ->> 'dob_month' as meta_dob_month,
  metadata ->> 'dob_day' as meta_dob_day
from
  public.users
where
  date_of_birth is null
order by
  is_active desc,
  full_name asc;

-- ------------------------------------------------------------------------------
-- 3. MARRIED USERS: WEDDING ANNIVERSARY STATUS & VALUES
-- Lists all married users, their current civil_status key, whether wedanniv_date
-- exists, and what the value is.
-- ------------------------------------------------------------------------------
select
  id,
  member_id,
  full_name,
  email,
  phone,
  is_active,
  coalesce(
    metadata ->> 'civil_status',
    metadata ->> 'civilstatus',
    metadata ->> 'Civil Status'
  ) as civil_status,
  metadata ->> 'wedanniv_date' as wedanniv_date,
  case
    when nullif(trim(metadata ->> 'wedanniv_date'), '') is not null then 'HAS_ANNIVERSARY'
    else 'MISSING_ANNIVERSARY'
  end as anniversary_status
from
  public.users
where
  lower(
    trim(
      coalesce(
        metadata ->> 'civil_status',
        metadata ->> 'civilstatus',
        metadata ->> 'Civil Status',
        ''
      )
    )
  ) = 'married'
order by
  -- Show missing anniversary records first
  case
    when nullif(trim(metadata ->> 'wedanniv_date'), '') is null then 0
    else 1
  end,
  full_name asc;

-- ------------------------------------------------------------------------------
-- 4. CONSOLIDATED ACTION LIST: USERS NEEDING DATA CORRECTION
-- Returns users that either lack date_of_birth OR are married without wedanniv_date.
-- ------------------------------------------------------------------------------
select
  id,
  member_id,
  full_name,
  email,
  phone,
  is_active,
  date_of_birth,
  coalesce(
    metadata ->> 'civil_status',
    metadata ->> 'civilstatus',
    metadata ->> 'Civil Status'
  ) as civil_status,
  metadata ->> 'wedanniv_date' as wedanniv_date,
  concat_ws(
    ', ',
    case
      when date_of_birth is null then 'Missing Date of Birth'
    end,
    case
      when lower(
        trim(
          coalesce(
            metadata ->> 'civil_status',
            metadata ->> 'civilstatus',
            metadata ->> 'Civil Status',
            ''
          )
        )
      ) = 'married'
      and nullif(trim(metadata ->> 'wedanniv_date'), '') is null then 'Married but Missing wedanniv_date'
    end
  ) as validation_issues
from
  public.users
where
  date_of_birth is null
  or (
    lower(
      trim(
        coalesce(
          metadata ->> 'civil_status',
          metadata ->> 'civilstatus',
          metadata ->> 'Civil Status',
          ''
        )
      )
    ) = 'married'
    and nullif(trim(metadata ->> 'wedanniv_date'), '') is null
  )
order by
  is_active desc,
  full_name asc;
