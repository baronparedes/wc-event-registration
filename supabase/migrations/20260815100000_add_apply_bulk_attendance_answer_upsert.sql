begin;

create or replace function public.apply_bulk_attendance_answer_upsert (
  p_event_id uuid,
  p_rows jsonb,
  p_field_ids uuid[],
  p_answers jsonb
) returns void language plpgsql security definer
set
  search_path = public as $$
declare
  v_row jsonb;
  v_answer jsonb;
  v_attendee_kind text;
  v_registration_id uuid;
  v_public_registration_id uuid;
  v_attendance_field_id uuid;
  v_answer_text text;
  v_answer_number numeric;
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

  perform 1
  from public.attendance_settings attendance_settings
  where attendance_settings.event_id = p_event_id
    and attendance_settings.attendance_enabled;

  if not found then
    raise exception 'Attendance tracking is disabled for this event';
  end if;

  for v_row in
    select value
    from jsonb_array_elements(p_rows)
  loop
    v_attendee_kind := v_row ->> 'attendee_kind';

    if v_attendee_kind = 'registered' then
      v_registration_id := nullif(trim(coalesce(v_row ->> 'registration_id', '')), '')::uuid;

      perform 1
      from public.registrations registration
      where registration.id = v_registration_id
        and registration.event_id = p_event_id
        and registration.status in ('submitted', 'updated');

      if v_registration_id is null or not found then
        raise exception 'Active registration not found for event';
      end if;
    elsif v_attendee_kind = 'public' then
      v_public_registration_id := nullif(
        trim(coalesce(v_row ->> 'public_registration_id', '')),
        ''
      )::uuid;

      perform 1
      from public.public_registrations public_registration
      where public_registration.id = v_public_registration_id
        and public_registration.event_id = p_event_id
        and public_registration.status <> 'cancelled';

      if v_public_registration_id is null or not found then
        raise exception 'Active public registration not found for event';
      end if;
    else
      raise exception 'Unsupported attendee_kind: %', coalesce(v_attendee_kind, '<null>');
    end if;
  end loop;

  if cardinality(coalesce(p_field_ids, array[]::uuid[])) > 0 then
    perform 1
    from unnest(p_field_ids) as field_id
    left join public.attendance_fields attendance_field
      on attendance_field.id = field_id
      and attendance_field.event_id = p_event_id
      and attendance_field.is_active
    where attendance_field.id is null;

    if found then
      raise exception 'An attendance field does not belong to the active event fields';
    end if;

    delete from public.attendance_answers attendance_answer
    where attendance_answer.registration_id in (
      select nullif(trim(coalesce(value ->> 'registration_id', '')), '')::uuid
      from jsonb_array_elements(p_rows)
      where value ->> 'attendee_kind' = 'registered'
    )
      and attendance_answer.attendance_field_id = any(p_field_ids);

    delete from public.public_attendance_answers public_attendance_answer
    where public_attendance_answer.public_registration_id in (
      select nullif(trim(coalesce(value ->> 'public_registration_id', '')), '')::uuid
      from jsonb_array_elements(p_rows)
      where value ->> 'attendee_kind' = 'public'
    )
      and public_attendance_answer.attendance_field_id = any(p_field_ids);
  end if;

  for v_answer in
    select value
    from jsonb_array_elements(p_answers)
  loop
    v_attendee_kind := v_answer ->> 'attendee_kind';
    v_registration_id := nullif(trim(coalesce(v_answer ->> 'registration_id', '')), '')::uuid;
    v_public_registration_id := nullif(
      trim(coalesce(v_answer ->> 'public_registration_id', '')),
      ''
    )::uuid;
    v_attendance_field_id := nullif(
      trim(coalesce(v_answer ->> 'attendance_field_id', '')),
      ''
    )::uuid;
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

    if v_attendance_field_id is null then
      raise exception 'attendance_field_id is required for each answer';
    end if;

    if v_answer_text is null and v_answer_number is null then
      raise exception 'An attendance answer value is required';
    end if;

    perform 1
    from public.attendance_fields attendance_field
    where attendance_field.id = v_attendance_field_id
      and attendance_field.event_id = p_event_id
      and attendance_field.is_active;

    if not found then
      raise exception 'Attendance answer field does not belong to the active event fields';
    end if;

    if v_attendee_kind = 'registered' then
      if v_registration_id is null then
        raise exception 'registration_id is required for registered answers';
      end if;

      insert into public.attendance_answers (
        registration_id,
        attendance_field_id,
        answer_text,
        answer_number
      )
      values (v_registration_id, v_attendance_field_id, v_answer_text, v_answer_number);
    elsif v_attendee_kind = 'public' then
      if v_public_registration_id is null then
        raise exception 'public_registration_id is required for public answers';
      end if;

      insert into public.public_attendance_answers (
        public_registration_id,
        attendance_field_id,
        answer_text,
        answer_number
      )
      values (v_public_registration_id, v_attendance_field_id, v_answer_text, v_answer_number);
    else
      raise exception 'Unsupported attendee_kind: %', coalesce(v_attendee_kind, '<null>');
    end if;
  end loop;
end;
$$;

grant
execute on function public.apply_bulk_attendance_answer_upsert (uuid, jsonb, uuid[], jsonb) to authenticated;

grant
execute on function public.apply_bulk_attendance_answer_upsert (uuid, jsonb, uuid[], jsonb) to service_role;

commit;
