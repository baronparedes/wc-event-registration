-- Migration: 20261107013614_sync_user_dob_metadata_trigger.sql
-- Description: Keep the denormalized date-of-birth metadata fields on public.users
-- (metadata.dob_day, metadata.dob_month, metadata.dob_year, metadata.age) in sync with the
-- first-class public.users.date_of_birth column. Prevents data drift when a member's date of
-- birth is changed after recruitment deployment or legacy import.
--
-- Format mirrors the legacy member directory / deploy_recruitment_applicant output:
-- numeric strings without zero padding (e.g. dob_month = '5'), empty strings when unknown.
-- metadata.sr_pwd is only ever promoted to true when age >= 60; it is never cleared because the
-- flag also represents PWD status which cannot be derived from date of birth.
begin;

create or replace function public.sync_user_dob_metadata () returns trigger language plpgsql
set
  search_path = public as $$
declare
  v_age integer;
begin
  if tg_op = 'UPDATE' and new.date_of_birth is not distinct from old.date_of_birth then
    return new;
  end if;

  if tg_op = 'INSERT' and new.date_of_birth is null then
    return new;
  end if;

  if new.date_of_birth is null then
    new.metadata := coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
      'dob_day', '',
      'dob_month', '',
      'dob_year', '',
      'age', ''
    );
    return new;
  end if;

  v_age := extract(
    year
    from
      age ((now() at time zone 'Asia/Manila')::date, new.date_of_birth)
  )::integer;

  new.metadata := coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
    'dob_day', extract(day from new.date_of_birth)::integer::text,
    'dob_month', extract(month from new.date_of_birth)::integer::text,
    'dob_year', extract(year from new.date_of_birth)::integer::text,
    'age', v_age::text
  );

  if v_age >= 60 then
    new.metadata := new.metadata || jsonb_build_object('sr_pwd', true);
  end if;

  return new;
end;
$$;

comment on function public.sync_user_dob_metadata () is 'Keeps users.metadata dob_day/dob_month/dob_year/age in sync with users.date_of_birth.';

drop trigger if exists users_sync_dob_metadata on public.users;

create trigger users_sync_dob_metadata
before insert or update of date_of_birth on public.users for each row
execute function public.sync_user_dob_metadata ();

revoke
execute on function public.sync_user_dob_metadata ()
from
  public,
  anon,
  authenticated;

commit;
