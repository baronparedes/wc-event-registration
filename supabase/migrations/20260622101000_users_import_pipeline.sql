begin;

create table public.users_import_staging (
  id bigint generated always as identity primary key,
  batch_id uuid not null,
  row_number integer not null,
  rfid text,
  role text,
  category text,
  surname text,
  firstname text,
  nickname text,
  sr_pwd text,
  first_sunday text,
  second_sunday text,
  third_sunday text,
  fourth_sunday text,
  fifth_sunday text,
  is_oic text,
  email text,
  raw_payload jsonb not null default '{}'::jsonb,
  inserted_at timestamptz not null default now(),
  constraint users_import_staging_row_positive check (row_number > 0),
  constraint users_import_staging_batch_row_unique unique (batch_id, row_number)
);

create index users_import_staging_batch_idx on public.users_import_staging (batch_id);

create index users_import_staging_batch_rfid_idx on public.users_import_staging (batch_id, rfid);

create table public.import_errors (
  id bigint generated always as identity primary key,
  batch_id uuid not null,
  staging_row_id bigint not null references public.users_import_staging (id) on delete cascade,
  row_number integer not null,
  error_code text not null,
  error_message text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index import_errors_batch_idx on public.import_errors (batch_id);

create index import_errors_batch_row_idx on public.import_errors (batch_id, row_number);

create or replace function public.is_valid_email (email_input text, strict boolean default false) returns boolean language sql immutable as $$
  select case
    when email_input is null then true
    when length(trim(email_input)) = 0 then true
    when strict then trim(email_input) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    else position('@' in trim(email_input)) > 1
      and position('.' in split_part(trim(email_input), '@', 2)) > 1
  end;
$$;

create or replace function public.process_members_import_batch (
  p_batch_id uuid,
  p_email_strict boolean default false
) returns table (
  total_rows integer,
  valid_rows integer,
  inserted_users integer,
  updated_users integer,
  error_rows integer
) language plpgsql security definer
set
  search_path = public as $$
declare
  v_total_rows integer := 0;
  v_valid_rows integer := 0;
  v_inserted_users integer := 0;
  v_updated_users integer := 0;
  v_error_rows integer := 0;
begin
  delete from public.import_errors
  where batch_id = p_batch_id;

  insert into public.import_errors (
    batch_id,
    staging_row_id,
    row_number,
    error_code,
    error_message,
    raw_payload
  )
  select
    s.batch_id,
    s.id,
    s.row_number,
    'MISSING_RFID',
    'RFID is required',
    s.raw_payload
  from public.users_import_staging s
  where s.batch_id = p_batch_id
    and nullif(trim(s.rfid), '') is null;

  insert into public.import_errors (
    batch_id,
    staging_row_id,
    row_number,
    error_code,
    error_message,
    raw_payload
  )
  select
    s.batch_id,
    s.id,
    s.row_number,
    'MISSING_SURNAME',
    'Surname is required',
    s.raw_payload
  from public.users_import_staging s
  where s.batch_id = p_batch_id
    and nullif(trim(s.surname), '') is null;

  insert into public.import_errors (
    batch_id,
    staging_row_id,
    row_number,
    error_code,
    error_message,
    raw_payload
  )
  select
    s.batch_id,
    s.id,
    s.row_number,
    'MISSING_FIRSTNAME',
    'Firstname is required',
    s.raw_payload
  from public.users_import_staging s
  where s.batch_id = p_batch_id
    and nullif(trim(s.firstname), '') is null;

  insert into public.import_errors (
    batch_id,
    staging_row_id,
    row_number,
    error_code,
    error_message,
    raw_payload
  )
  select
    s.batch_id,
    s.id,
    s.row_number,
    'INVALID_EMAIL',
    'Email is malformed',
    s.raw_payload
  from public.users_import_staging s
  where s.batch_id = p_batch_id
    and not public.is_valid_email(s.email, p_email_strict);

  insert into public.import_errors (
    batch_id,
    staging_row_id,
    row_number,
    error_code,
    error_message,
    raw_payload
  )
  select
    s.batch_id,
    s.id,
    s.row_number,
    'DUPLICATE_RFID_IN_BATCH',
    'RFID appears multiple times in this batch',
    s.raw_payload
  from public.users_import_staging s
  join (
    select batch_id, trim(rfid) as rfid
    from public.users_import_staging
    where batch_id = p_batch_id
      and nullif(trim(rfid), '') is not null
    group by batch_id, trim(rfid)
    having count(*) > 1
  ) duplicates
    on duplicates.batch_id = s.batch_id
    and duplicates.rfid = trim(s.rfid)
  where s.batch_id = p_batch_id;

  select count(*)
  into v_total_rows
  from public.users_import_staging
  where batch_id = p_batch_id;

  select count(*)
  into v_error_rows
  from (
    select distinct ie.staging_row_id
    from public.import_errors ie
    where ie.batch_id = p_batch_id
  ) distinct_errors;

  if v_error_rows > 0 then
    v_valid_rows := greatest(v_total_rows - v_error_rows, 0);

    return query
    select
      v_total_rows,
      v_valid_rows,
      0,
      0,
      v_error_rows;

    return;
  end if;

  with valid_rows as (
    select
      trim(s.rfid) as member_id,
      trim(s.firstname) as first_name,
      trim(s.surname) as last_name,
      concat_ws(' ', trim(s.firstname), trim(s.surname)) as full_name,
      nullif(trim(s.nickname), '') as nickname,
      lower(nullif(trim(s.email), '')) as email,
      jsonb_strip_nulls(
        jsonb_build_object(
          'role', nullif(trim(s.role), ''),
          'category', nullif(trim(s.category), ''),
          'sr_pwd', nullif(trim(s.sr_pwd), ''),
          'is_oic', case
            when nullif(trim(s.is_oic), '') is null then null
            when trim(s.is_oic) in ('1', 'true', 'TRUE', 'yes', 'YES') then true
            when trim(s.is_oic) in ('0', 'false', 'FALSE', 'no', 'NO') then false
            else null
          end,
          'availability', jsonb_strip_nulls(
            jsonb_build_object(
              'first_sunday', nullif(trim(s.first_sunday), ''),
              'second_sunday', nullif(trim(s.second_sunday), ''),
              'third_sunday', nullif(trim(s.third_sunday), ''),
              'fourth_sunday', nullif(trim(s.fourth_sunday), ''),
              'fifth_sunday', nullif(trim(s.fifth_sunday), '')
            )
          )
        )
      ) as metadata
    from public.users_import_staging s
    where s.batch_id = p_batch_id
  ),
  upserted as (
    insert into public.users (
      member_id,
      first_name,
      last_name,
      full_name,
      nickname,
      email,
      metadata
    )
    select
      vr.member_id,
      vr.first_name,
      vr.last_name,
      vr.full_name,
      vr.nickname,
      vr.email,
      vr.metadata
    from valid_rows vr
    on conflict (member_id)
    do update set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      full_name = excluded.full_name,
      nickname = excluded.nickname,
      email = excluded.email,
      metadata = excluded.metadata,
      updated_at = now()
    returning xmax = 0 as was_inserted
  )
  select
    count(*) filter (where was_inserted),
    count(*) filter (where not was_inserted)
  into v_inserted_users, v_updated_users
  from upserted;

  v_valid_rows := v_total_rows;

  return query
  select
    v_total_rows,
    v_valid_rows,
    coalesce(v_inserted_users, 0),
    coalesce(v_updated_users, 0),
    v_error_rows;
end;
$$;

commit;
