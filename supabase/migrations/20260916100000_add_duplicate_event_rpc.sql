begin;

create or replace function public.duplicate_event (
  p_source_event_id uuid,
  p_new_title text,
  p_new_slug text,
  p_admin_auth_user_id uuid default null
) returns uuid language plpgsql security definer
set
  search_path = public as $$
declare
  v_new_event_id uuid := gen_random_uuid();
  v_admin_id uuid := null;
  v_source_event public.events%rowtype;
begin
  -- 1. Check if slug already exists
  if exists (select 1 from public.events where slug = p_new_slug) then
    raise exception 'DUPLICATE_SLUG' using errcode = '23505';
  end if;

  -- 2. Fetch source event
  select * into v_source_event
  from public.events
  where id = p_source_event_id;

  if not found then
    raise exception 'SOURCE_EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- 3. Resolve admin ID if auth user id provided
  if p_admin_auth_user_id is not null then
    select id into v_admin_id
    from public.admins
    where auth_user_id = p_admin_auth_user_id;
  elsif auth.uid() is not null then
    select id into v_admin_id
    from public.admins
    where auth_user_id = auth.uid();
  end if;

  -- 4. Insert new event (status always 'draft')
  insert into public.events (
    id,
    slug,
    title,
    description,
    location,
    starts_at,
    ends_at,
    registration_opens_at,
    registration_closes_at,
    status,
    duplicate_policy,
    require_id_lookup,
    registration_mode,
    metadata,
    created_by_admin_id,
    allow_public_registrations
  ) values (
    v_new_event_id,
    p_new_slug,
    p_new_title,
    v_source_event.description,
    v_source_event.location,
    v_source_event.starts_at,
    v_source_event.ends_at,
    v_source_event.registration_opens_at,
    v_source_event.registration_closes_at,
    'draft',
    v_source_event.duplicate_policy,
    v_source_event.require_id_lookup,
    v_source_event.registration_mode,
    v_source_event.metadata,
    v_admin_id,
    v_source_event.allow_public_registrations
  );

  -- 5. Copy event_fields
  insert into public.event_fields (
    id,
    event_id,
    field_key,
    label,
    field_type,
    is_required,
    is_active,
    placeholder,
    help_text,
    options,
    validation_rules,
    display_order,
    applicability
  )
  select
    gen_random_uuid(),
    v_new_event_id,
    ef.field_key,
    ef.label,
    ef.field_type,
    ef.is_required,
    ef.is_active,
    ef.placeholder,
    ef.help_text,
    ef.options,
    ef.validation_rules,
    ef.display_order,
    ef.applicability
  from public.event_fields ef
  where ef.event_id = p_source_event_id;

  -- 6. Copy attendance_settings
  insert into public.attendance_settings (
    event_id,
    attendance_enabled,
    timeslot_enabled,
    timeslots,
    enforce_check_in_event_window
  )
  select
    v_new_event_id,
    ast.attendance_enabled,
    ast.timeslot_enabled,
    ast.timeslots,
    ast.enforce_check_in_event_window
  from public.attendance_settings ast
  where ast.event_id = p_source_event_id;

  -- 7. Copy attendance_fields
  insert into public.attendance_fields (
    id,
    event_id,
    field_key,
    label,
    field_type,
    is_required,
    is_active,
    display_order,
    options,
    validation_rules
  )
  select
    gen_random_uuid(),
    v_new_event_id,
    af.field_key,
    af.label,
    af.field_type,
    af.is_required,
    af.is_active,
    af.display_order,
    af.options,
    af.validation_rules
  from public.attendance_fields af
  where af.event_id = p_source_event_id;

  return v_new_event_id;
exception
  when others then
    -- Re-raise exception to ensure complete transaction rollback
    raise;
end;
$$;

grant
execute on function public.duplicate_event (uuid, text, text, uuid) to authenticated;

grant
execute on function public.duplicate_event (uuid, text, text, uuid) to service_role;

commit;
