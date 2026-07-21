begin;

alter table public.users
add column if not exists role text not null default '',
add column if not exists category text not null default '';

update public.users
set role = coalesce(
  nullif(trim(role), ''),
  case
    when jsonb_typeof(metadata -> 'role') = 'string' then trim(metadata ->> 'role')
    else ''
  end,
  ''
),
category = coalesce(
  nullif(trim(category), ''),
  case
    when jsonb_typeof(metadata -> 'category') = 'string' then trim(metadata ->> 'category')
    else ''
  end,
  ''
),
metadata = coalesce(metadata, '{}'::jsonb) - 'role' - 'category',
updated_at = now()
where
  nullif(trim(role), '') is null
  or nullif(trim(category), '') is null
  or metadata ? 'role'
  or metadata ? 'category';

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
    'MISSING_ROLE',
    'Role is required',
    s.raw_payload
  from public.users_import_staging s
  where s.batch_id = p_batch_id
    and nullif(trim(s.role), '') is null;

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
    'MISSING_CATEGORY',
    'Category is required',
    s.raw_payload
  from public.users_import_staging s
  where s.batch_id = p_batch_id
    and nullif(trim(s.category), '') is null;

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
      trim(s.role) as role,
      trim(s.category) as category,
      jsonb_strip_nulls(
        jsonb_build_object(
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
      role,
      category,
      metadata
    )
    select
      vr.member_id,
      vr.first_name,
      vr.last_name,
      vr.full_name,
      vr.nickname,
      vr.email,
      vr.role,
      vr.category,
      vr.metadata
    from valid_rows vr
    on conflict (member_id)
    do update set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      full_name = excluded.full_name,
      nickname = excluded.nickname,
      email = excluded.email,
      role = excluded.role,
      category = excluded.category,
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
    v_inserted_users,
    v_updated_users,
    v_error_rows;
end;
$$;

create or replace function public.apply_bulk_member_upsert (p_rows jsonb) returns table (inserted_count integer, updated_count integer) language plpgsql security definer
set
  search_path = public as $$
declare
  v_row jsonb;
  v_operation text;
  v_target_id uuid;
  v_member_id text;
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_nickname text;
  v_email text;
  v_phone text;
  v_date_of_birth text;
  v_role text;
  v_category text;
  v_metadata jsonb;
  v_inserted_count integer := 0;
  v_updated_count integer := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  for v_row in
    select value
    from jsonb_array_elements(p_rows)
  loop
    v_operation := coalesce(v_row ->> 'operation', '');
    v_member_id := trim(coalesce(v_row ->> 'member_id', ''));
    v_first_name := trim(coalesce(v_row ->> 'first_name', ''));
    v_last_name := trim(coalesce(v_row ->> 'last_name', ''));
    v_full_name := concat_ws(' ', v_first_name, v_last_name);
    v_nickname := nullif(trim(coalesce(v_row ->> 'nickname', '')), '');
    v_email := nullif(lower(trim(coalesce(v_row ->> 'email', ''))), '');
    v_phone := nullif(trim(coalesce(v_row ->> 'phone', '')), '');
    v_date_of_birth := nullif(trim(coalesce(v_row ->> 'date_of_birth', '')), '');
    v_role := trim(coalesce(v_row ->> 'role', coalesce(v_row -> 'metadata' ->> 'role', '')));
    v_category := trim(
      coalesce(v_row ->> 'category', coalesce(v_row -> 'metadata' ->> 'category', ''))
    );

    if jsonb_typeof(v_row -> 'metadata') = 'object' then
      v_metadata := coalesce(v_row -> 'metadata', '{}'::jsonb);
    else
      v_metadata := '{}'::jsonb;
    end if;

    if v_metadata ? 'isoic' and not (v_metadata ? 'is_oic') then
      v_metadata := jsonb_set(v_metadata, '{is_oic}', v_metadata -> 'isoic', true);
    end if;

    if v_metadata ? '1st_sunday' and not (v_metadata ? 'first_sunday') then
      v_metadata := jsonb_set(v_metadata, '{first_sunday}', v_metadata -> '1st_sunday', true);
    end if;

    if v_metadata ? '2nd_sunday' and not (v_metadata ? 'second_sunday') then
      v_metadata := jsonb_set(v_metadata, '{second_sunday}', v_metadata -> '2nd_sunday', true);
    end if;

    if v_metadata ? '3rd_sunday' and not (v_metadata ? 'third_sunday') then
      v_metadata := jsonb_set(v_metadata, '{third_sunday}', v_metadata -> '3rd_sunday', true);
    end if;

    if v_metadata ? '4th_sunday' and not (v_metadata ? 'fourth_sunday') then
      v_metadata := jsonb_set(v_metadata, '{fourth_sunday}', v_metadata -> '4th_sunday', true);
    end if;

    if v_metadata ? '5th_sunday' and not (v_metadata ? 'fifth_sunday') then
      v_metadata := jsonb_set(v_metadata, '{fifth_sunday}', v_metadata -> '5th_sunday', true);
    end if;

    if jsonb_typeof(v_metadata -> 'availability') = 'object' then
      if (v_metadata -> 'availability') ? 'first_sunday' and not (v_metadata ? 'first_sunday') then
        v_metadata := jsonb_set(
          v_metadata,
          '{first_sunday}',
          v_metadata -> 'availability' -> 'first_sunday',
          true
        );
      end if;

      if (v_metadata -> 'availability') ? 'second_sunday' and not (v_metadata ? 'second_sunday') then
        v_metadata := jsonb_set(
          v_metadata,
          '{second_sunday}',
          v_metadata -> 'availability' -> 'second_sunday',
          true
        );
      end if;

      if (v_metadata -> 'availability') ? 'third_sunday' and not (v_metadata ? 'third_sunday') then
        v_metadata := jsonb_set(
          v_metadata,
          '{third_sunday}',
          v_metadata -> 'availability' -> 'third_sunday',
          true
        );
      end if;

      if (v_metadata -> 'availability') ? 'fourth_sunday' and not (v_metadata ? 'fourth_sunday') then
        v_metadata := jsonb_set(
          v_metadata,
          '{fourth_sunday}',
          v_metadata -> 'availability' -> 'fourth_sunday',
          true
        );
      end if;

      if (v_metadata -> 'availability') ? 'fifth_sunday' and not (v_metadata ? 'fifth_sunday') then
        v_metadata := jsonb_set(
          v_metadata,
          '{fifth_sunday}',
          v_metadata -> 'availability' -> 'fifth_sunday',
          true
        );
      end if;
    end if;

    v_metadata := v_metadata
      - 'role'
      - 'category'
      - 'availability'
      - 'isoic'
      - '1st_sunday'
      - '2nd_sunday'
      - '3rd_sunday'
      - '4th_sunday'
      - '5th_sunday';

    if v_operation not in ('insert', 'update') then
      raise exception 'Unsupported operation: %', v_operation;
    end if;

    if v_member_id = '' then
      raise exception 'member_id cannot be empty';
    end if;

    if v_first_name = '' or v_last_name = '' then
      raise exception 'first_name and last_name are required';
    end if;

    if v_nickname is null then
      raise exception 'nickname is required';
    end if;

    if v_role = '' then
      raise exception 'role is required';
    end if;

    if v_category = '' then
      raise exception 'category is required';
    end if;

    if v_operation = 'insert' then
      insert into public.users (
        member_id,
        first_name,
        last_name,
        full_name,
        nickname,
        email,
        phone,
        date_of_birth,
        role,
        category,
        metadata
      )
      values (
        v_member_id,
        v_first_name,
        v_last_name,
        v_full_name,
        v_nickname,
        v_email,
        v_phone,
        case when v_date_of_birth is null then null else v_date_of_birth::date end,
        v_role,
        v_category,
        v_metadata
      );

      v_inserted_count := v_inserted_count + 1;
    else
      v_target_id := nullif(trim(coalesce(v_row ->> 'target_id', '')), '')::uuid;

      update public.users
      set
        member_id = v_member_id,
        first_name = v_first_name,
        last_name = v_last_name,
        full_name = v_full_name,
        nickname = v_nickname,
        email = v_email,
        phone = v_phone,
        date_of_birth = case when v_date_of_birth is null then null else v_date_of_birth::date end,
        role = v_role,
        category = v_category,
        metadata = (
          coalesce(public.users.metadata, '{}'::jsonb)
          - 'role'
          - 'category'
          - 'sr_pwd'
          - 'is_oic'
          - 'isoic'
          - 'availability'
          - '1st_sunday'
          - '2nd_sunday'
          - '3rd_sunday'
          - '4th_sunday'
          - '5th_sunday'
          - 'first_sunday'
          - 'second_sunday'
          - 'third_sunday'
          - 'fourth_sunday'
          - 'fifth_sunday'
        ) || v_metadata,
        updated_at = now()
      where id = v_target_id;

      if not found then
        raise exception 'Target member not found for update: %', v_target_id;
      end if;

      v_updated_count := v_updated_count + 1;
    end if;
  end loop;

  return query
  select
    v_inserted_count,
    v_updated_count;
end;
$$;

commit;
