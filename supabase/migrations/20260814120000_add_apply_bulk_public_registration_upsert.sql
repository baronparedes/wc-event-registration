begin;

create or replace function public.apply_bulk_public_registration_upsert (
  p_event_id uuid,
  p_rows jsonb,
  p_field_ids uuid[],
  p_answers jsonb
) returns table (inserted_count integer, updated_count integer) language plpgsql security definer
set
  search_path = public as $$
declare
  v_row jsonb;
  v_answer jsonb;
  v_row_index integer;
  v_registration_id uuid;
  v_first_name text;
  v_last_name text;
  v_nickname text;
  v_email text;
  v_phone text;
  v_answer_field_id uuid;
  v_answer_text text;
  v_answer_number numeric;
  v_answer_boolean boolean;
  v_answer_date date;
  v_answer_json jsonb;
  v_inserted_count integer := 0;
  v_updated_count integer := 0;
begin
  if p_event_id is null then
    raise exception 'p_event_id is required';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'p_answers must be a JSON array';
  end if;

  create temporary table tmp_bulk_public_registration_map (
    row_index integer primary key,
    registration_id uuid not null
  ) on commit drop;

  for v_row in
    select value
    from jsonb_array_elements(p_rows)
  loop
    v_row_index := nullif(trim(coalesce(v_row ->> 'row_index', '')), '')::integer;
    v_first_name := trim(coalesce(v_row ->> 'first_name', ''));
    v_last_name := trim(coalesce(v_row ->> 'last_name', ''));
    v_nickname := nullif(trim(coalesce(v_row ->> 'nickname', '')), '');
    v_email := lower(trim(coalesce(v_row ->> 'email', '')));
    v_phone := nullif(trim(coalesce(v_row ->> 'phone', '')), '');

    if v_row_index is null then
      raise exception 'row_index is required for each row';
    end if;

    if v_first_name = '' or v_last_name = '' then
      raise exception 'first_name and last_name are required';
    end if;

    if v_email = '' then
      raise exception 'email is required';
    end if;

    select pr.id
    into v_registration_id
    from public.public_registrations pr
    where pr.event_id = p_event_id
      and pr.registration_scope_key = 'primary'
      and lower(pr.email) = v_email
    for update;

    if found then
      update public.public_registrations
      set
        first_name = v_first_name,
        last_name = v_last_name,
        nickname = v_nickname,
        email = v_email,
        phone = v_phone,
        status = 'updated',
        submitted_at = now(),
        updated_at = now()
      where id = v_registration_id;

      v_updated_count := v_updated_count + 1;
    else
      insert into public.public_registrations (
        event_id,
        registration_scope_key,
        first_name,
        last_name,
        nickname,
        email,
        phone,
        status,
        idempotency_key
      )
      values (
        p_event_id,
        'primary',
        v_first_name,
        v_last_name,
        v_nickname,
        v_email,
        v_phone,
        'submitted',
        null
      )
      returning id into v_registration_id;

      v_inserted_count := v_inserted_count + 1;
    end if;

    insert into tmp_bulk_public_registration_map (row_index, registration_id)
    values (v_row_index, v_registration_id);
  end loop;

  if cardinality(coalesce(p_field_ids, array[]::uuid[])) > 0 then
    delete from public.public_registration_answers pra
    using tmp_bulk_public_registration_map row_map
    where pra.public_registration_id = row_map.registration_id
      and pra.event_field_id = any(p_field_ids);
  end if;

  for v_answer in
    select value
    from jsonb_array_elements(p_answers)
  loop
    v_row_index := nullif(trim(coalesce(v_answer ->> 'row_index', '')), '')::integer;
    v_answer_field_id := nullif(trim(coalesce(v_answer ->> 'event_field_id', '')), '')::uuid;

    if v_row_index is null then
      raise exception 'row_index is required for each answer';
    end if;

    if v_answer_field_id is null then
      raise exception 'event_field_id is required for each answer';
    end if;

    select row_map.registration_id
    into v_registration_id
    from tmp_bulk_public_registration_map row_map
    where row_map.row_index = v_row_index;

    if v_registration_id is null then
      raise exception 'No registration found for answer row_index: %', v_row_index;
    end if;

    v_answer_text := case
      when v_answer ? 'answer_text' and jsonb_typeof(v_answer -> 'answer_text') <> 'null'
      then v_answer ->> 'answer_text'
      else null
    end;

    v_answer_number := case
      when v_answer ? 'answer_number' and jsonb_typeof(v_answer -> 'answer_number') <> 'null'
      then (v_answer ->> 'answer_number')::numeric
      else null
    end;

    v_answer_boolean := case
      when v_answer ? 'answer_boolean' and jsonb_typeof(v_answer -> 'answer_boolean') <> 'null'
      then (v_answer ->> 'answer_boolean')::boolean
      else null
    end;

    v_answer_date := case
      when v_answer ? 'answer_date' and jsonb_typeof(v_answer -> 'answer_date') <> 'null'
      then (v_answer ->> 'answer_date')::date
      else null
    end;

    v_answer_json := case
      when v_answer ? 'answer_json' and jsonb_typeof(v_answer -> 'answer_json') <> 'null'
      then v_answer -> 'answer_json'
      else null
    end;

    insert into public.public_registration_answers (
      public_registration_id,
      event_field_id,
      answer_text,
      answer_number,
      answer_boolean,
      answer_date,
      answer_json
    )
    values (
      v_registration_id,
      v_answer_field_id,
      v_answer_text,
      v_answer_number,
      v_answer_boolean,
      v_answer_date,
      v_answer_json
    );
  end loop;

  return query
  select
    v_inserted_count,
    v_updated_count;
end;
$$;

grant
execute on function public.apply_bulk_public_registration_upsert (uuid, jsonb, uuid[], jsonb) to authenticated;

grant
execute on function public.apply_bulk_public_registration_upsert (uuid, jsonb, uuid[], jsonb) to service_role;

commit;
