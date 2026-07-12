begin;

create or replace function public.apply_bulk_member_upsert(p_rows jsonb)
returns table (
  inserted_count integer,
  updated_count integer
)
language plpgsql
security definer
set search_path = public
as $$
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

grant execute on function public.apply_bulk_member_upsert(jsonb) to authenticated;

grant execute on function public.apply_bulk_member_upsert(jsonb) to service_role;

commit;
