begin;

create or replace function public.apply_registration_submission (
  p_event_id uuid,
  p_user_id uuid,
  p_registration_scope_key text,
  p_idempotency_key text,
  p_has_compound_scope boolean,
  p_duplicate_policy text
) returns table (
  registration_id uuid,
  status text,
  is_new boolean,
  should_write_answers boolean,
  error_code text
) language plpgsql security definer
set
  search_path = public as $$
declare
  v_constraint_name text;
  v_existing_id uuid;
  v_existing_user_id uuid;
  v_existing_status text;
begin
  begin
    insert into public.registrations (
      event_id,
      user_id,
      registration_scope_key,
      idempotency_key,
      status,
      source
    )
    values (
      p_event_id,
      p_user_id,
      p_registration_scope_key,
      p_idempotency_key,
      'submitted',
      'public'
    )
    returning id into registration_id;

    return query select registration_id, 'submitted', true, true, null::text;
    return;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;
  end;

  if v_constraint_name = 'registrations_event_idempotency_unique_idx' then
    select r.id, r.user_id, r.status::text
    into v_existing_id, v_existing_user_id, v_existing_status
    from public.registrations r
    where r.event_id = p_event_id
      and r.idempotency_key = p_idempotency_key
    limit 1;

    if v_existing_id is not null and v_existing_user_id = p_user_id then
      return query select v_existing_id, coalesce(v_existing_status, 'submitted'), false, false, null::text;
      return;
    end if;
  end if;

  if p_has_compound_scope and p_duplicate_policy = 'allow_multiple_update' then
    select r.id
    into v_existing_id
    from public.registrations r
    where r.event_id = p_event_id
      and r.user_id = p_user_id
      and r.registration_scope_key = p_registration_scope_key
    limit 1;

    if v_existing_id is not null then
      update public.registrations
      set status = 'updated', submitted_at = now()
      where id = v_existing_id;

      return query select v_existing_id, 'updated', false, true, null::text;
      return;
    end if;

    return query select null::uuid, null::text, false, false, 'duplicate_compound_key';
    return;
  elsif p_has_compound_scope then
    return query select null::uuid, null::text, false, false, 'duplicate_compound_key';
    return;
  end if;

  if p_duplicate_policy = 'allow_multiple' then
    return query select null::uuid, null::text, false, false, 'REGISTRATION_CONFLICT_RECOVERY_FAILED';
    return;
  end if;

  if p_duplicate_policy = 'allow_multiple_update' then
    select r.id
    into v_existing_id
    from public.registrations r
    where r.event_id = p_event_id
      and r.user_id = p_user_id
      and r.registration_scope_key = p_registration_scope_key
    limit 1;

    if v_existing_id is null then
      return query select null::uuid, null::text, false, false, 'duplicate_compound_key';
      return;
    end if;

    update public.registrations
    set status = 'updated', submitted_at = now()
    where id = v_existing_id;

    return query select v_existing_id, 'updated', false, true, null::text;
    return;
  end if;

  select r.id, r.status::text
  into v_existing_id, v_existing_status
  from public.registrations r
  where r.event_id = p_event_id
    and r.user_id = p_user_id
    and r.registration_scope_key = 'primary'
  limit 1;

  if v_existing_id is null then
    return query select null::uuid, null::text, false, false,
      case when p_duplicate_policy = 'allow_multiple_update'
        then 'duplicate_compound_key'
        else 'REGISTRATION_CONFLICT_RECOVERY_FAILED'
      end;
    return;
  end if;

  if p_duplicate_policy = 'block' then
    return query select null::uuid, null::text, false, false, 'duplicate_blocked';
    return;
  end if;

  update public.registrations
  set status = 'updated', submitted_at = now()
  where id = v_existing_id;

  return query select v_existing_id, 'updated', false, true, null::text;
end
$$;

grant
execute on function public.apply_registration_submission (uuid, uuid, text, text, boolean, text) to service_role;

commit;
