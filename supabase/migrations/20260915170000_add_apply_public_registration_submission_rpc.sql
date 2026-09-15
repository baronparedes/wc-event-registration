begin;

create or replace function public.apply_public_registration_submission (
  p_event_id uuid,
  p_registration_scope_key text,
  p_idempotency_key text,
  p_has_compound_scope boolean,
  p_duplicate_policy text,
  p_first_name text,
  p_last_name text,
  p_nickname text,
  p_email text,
  p_phone text
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
  v_existing_status text;
begin
  begin
    insert into public.public_registrations (
      event_id,
      registration_scope_key,
      first_name,
      last_name,
      nickname,
      email,
      phone,
      idempotency_key,
      status
    )
    values (
      p_event_id,
      p_registration_scope_key,
      p_first_name,
      p_last_name,
      p_nickname,
      p_email,
      p_phone,
      p_idempotency_key,
      'submitted'
    )
    returning id into registration_id;

    return query select registration_id, 'submitted', true, true, null::text;
    return;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;
  end;

  if v_constraint_name = 'public_registrations_event_idempotency_unique_idx' then
    select pr.id, pr.status::text
    into v_existing_id, v_existing_status
    from public.public_registrations pr
    where pr.event_id = p_event_id
      and pr.idempotency_key = p_idempotency_key
    limit 1;

    if v_existing_id is not null then
      return query select v_existing_id, coalesce(v_existing_status, 'submitted'), false, false, null::text;
      return;
    end if;
  end if;

  if p_has_compound_scope then
    if p_duplicate_policy = 'allow_multiple_update' then
      select pr.id
      into v_existing_id
      from public.public_registrations pr
      where pr.event_id = p_event_id
        and pr.registration_scope_key = p_registration_scope_key
        and lower(pr.email) = lower(p_email)
      limit 1;

      if v_existing_id is not null then
        update public.public_registrations
        set status = 'updated', submitted_at = now()
        where id = v_existing_id;

        return query select v_existing_id, 'updated', false, true, null::text;
        return;
      end if;
    end if;

    return query select null::uuid, null::text, false, false, 'duplicate_compound_key';
    return;
  end if;

  if p_duplicate_policy = 'allow_multiple' then
    return query select null::uuid, null::text, false, false, 'REGISTRATION_CONFLICT_RECOVERY_FAILED';
    return;
  end if;

  select pr.id, pr.status::text
  into v_existing_id, v_existing_status
  from public.public_registrations pr
  where pr.event_id = p_event_id
    and pr.registration_scope_key = 'primary'
    and lower(pr.email) = lower(p_email)
  limit 1;

  if v_existing_id is null then
    return query select null::uuid, null::text, false, false, 'REGISTRATION_CONFLICT_RECOVERY_FAILED';
    return;
  end if;

  if p_duplicate_policy = 'block' then
    return query select null::uuid, null::text, false, false, 'duplicate_blocked';
    return;
  end if;

  update public.public_registrations
  set status = 'updated', submitted_at = now()
  where id = v_existing_id;

  return query select v_existing_id, 'updated', false, true, null::text;
end
$$;

grant
execute on function public.apply_public_registration_submission (
  uuid,
  text,
  text,
  boolean,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;

commit;
