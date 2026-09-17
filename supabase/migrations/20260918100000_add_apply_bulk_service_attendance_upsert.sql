begin;

create or replace function public.apply_bulk_service_attendance_upsert (
  p_layout_id uuid,
  p_rows jsonb,
  p_admin_user_id uuid default null
) returns table (
  inserted_count integer,
  updated_count integer,
  total_count integer
) language plpgsql security definer
set
  search_path = public as $$
declare
  v_row jsonb;
  v_user_id uuid;
  v_rfid text;
  v_service_date date;
  v_time_slot text;
  v_checked_in_at timestamptz;
  v_is_walk_in boolean;
  v_is_override boolean;
  v_is_manual_entry boolean;
  v_service_seat_id uuid;
  v_metadata jsonb;
  v_existing_id uuid;
  v_inserted_count integer := 0;
  v_updated_count integer := 0;
begin
  if p_layout_id is null then
    raise exception 'p_layout_id is required';
  end if;

  if not exists (select 1 from public.service_layouts where id = p_layout_id) then
    raise exception 'Service layout not found: %', p_layout_id;
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  for v_row in
    select value
    from jsonb_array_elements(p_rows)
  loop
    v_user_id := nullif(trim(coalesce(v_row ->> 'user_id', '')), '')::uuid;
    if v_user_id is null then
      raise exception 'user_id is required for all rows';
    end if;

    v_rfid := nullif(trim(coalesce(v_row ->> 'rfid', '')), '');
    v_service_date := (v_row ->> 'service_date')::date;
    if v_service_date is null then
      raise exception 'service_date is required for all rows';
    end if;

    v_time_slot := trim(coalesce(v_row ->> 'time_slot', ''));
    if length(v_time_slot) = 0 then
      raise exception 'time_slot is required for all rows';
    end if;

    if nullif(trim(coalesce(v_row ->> 'checked_in_at', '')), '') is not null then
      v_checked_in_at := (v_row ->> 'checked_in_at')::timestamptz;
    else
      v_checked_in_at := now();
    end if;

    v_is_walk_in := coalesce((v_row ->> 'is_walk_in')::boolean, false);
    v_is_override := coalesce((v_row ->> 'is_override')::boolean, false);
    v_is_manual_entry := coalesce((v_row ->> 'is_manual_entry')::boolean, false);
    v_service_seat_id := nullif(trim(coalesce(v_row ->> 'service_seat_id', '')), '')::uuid;

    if jsonb_typeof(v_row -> 'metadata') = 'object' then
      v_metadata := coalesce(v_row -> 'metadata', '{}'::jsonb);
    else
      v_metadata := '{}'::jsonb;
    end if;

    -- Check if record exists for this user, date, and time slot
    select id into v_existing_id
    from public.service_attendance
    where user_id = v_user_id
      and service_date = v_service_date
      and time_slot = v_time_slot
    limit 1;

    if v_existing_id is not null then
      update public.service_attendance
      set
        rfid = coalesce(v_rfid, service_attendance.rfid),
        service_seat_id = coalesce(v_service_seat_id, service_attendance.service_seat_id),
        metadata = coalesce(service_attendance.metadata, '{}'::jsonb) || v_metadata,
        updated_at = now(),
        updated_by = coalesce(p_admin_user_id, service_attendance.updated_by)
      where id = v_existing_id;

      v_updated_count := v_updated_count + 1;
    else
      insert into public.service_attendance (
        user_id,
        rfid,
        service_date,
        time_slot,
        checked_in_at,
        is_walk_in,
        is_override,
        is_manual_entry,
        service_seat_id,
        metadata,
        created_by,
        updated_by
      ) values (
        v_user_id,
        v_rfid,
        v_service_date,
        v_time_slot,
        v_checked_in_at,
        v_is_walk_in,
        v_is_override,
        v_is_manual_entry,
        v_service_seat_id,
        v_metadata,
        p_admin_user_id,
        p_admin_user_id
      );

      v_inserted_count := v_inserted_count + 1;
    end if;
  end loop;

  return query
  select
    v_inserted_count,
    v_updated_count,
    v_inserted_count + v_updated_count;
end;
$$;

grant
execute on function public.apply_bulk_service_attendance_upsert (uuid, jsonb, uuid) to authenticated;

grant
execute on function public.apply_bulk_service_attendance_upsert (uuid, jsonb, uuid) to service_role;

commit;
