begin;

-- 1. Enforce canWriteAdminData permission on duplicate_event
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
  if not (
    public.has_admin_permission('canWriteAdminData')
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'unauthorized';
  end if;

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
    allow_public_registrations,
    cover_image_key
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
    v_source_event.allow_public_registrations,
    v_source_event.cover_image_key
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
    raise;
end;
$$;

revoke
execute on function public.duplicate_event (uuid, text, text, uuid)
from
  public,
  anon,
  authenticated;

grant
execute on function public.duplicate_event (uuid, text, text, uuid) to authenticated,
service_role;

-- 2. Enforce canWriteAdminData permission on duplicate_form
create or replace function public.duplicate_form (
  p_source_form_id uuid,
  p_new_title text,
  p_new_slug text,
  p_admin_auth_user_id uuid default null
) returns uuid language plpgsql security definer
set
  search_path = public as $$
declare
  v_new_form_id uuid := gen_random_uuid();
  v_admin_id uuid := null;
  v_source_form public.forms%rowtype;
begin
  if not (
    public.has_admin_permission('canWriteAdminData')
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'unauthorized';
  end if;

  -- 1. Check if slug already exists
  if exists (select 1 from public.forms where slug = p_new_slug) then
    raise exception 'DUPLICATE_SLUG' using errcode = '23505';
  end if;

  -- 2. Fetch source form
  select * into v_source_form
  from public.forms
  where id = p_source_form_id;

  if not found then
    raise exception 'SOURCE_FORM_NOT_FOUND' using errcode = 'P0002';
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

  -- 4. Insert new form (status always 'draft')
  insert into public.forms (
    id,
    slug,
    title,
    description,
    status,
    duplicate_policy,
    audience,
    metadata,
    created_by_admin_id
  ) values (
    v_new_form_id,
    p_new_slug,
    p_new_title,
    v_source_form.description,
    'draft',
    v_source_form.duplicate_policy,
    v_source_form.audience,
    v_source_form.metadata,
    v_admin_id
  );

  -- 5. Copy form_fields
  insert into public.form_fields (
    id,
    form_id,
    field_key,
    label,
    field_type,
    is_required,
    is_active,
    placeholder,
    help_text,
    options,
    validation_rules,
    field_applicability,
    display_order
  )
  select
    gen_random_uuid(),
    v_new_form_id,
    ff.field_key,
    ff.label,
    ff.field_type,
    ff.is_required,
    ff.is_active,
    ff.placeholder,
    ff.help_text,
    ff.options,
    ff.validation_rules,
    ff.field_applicability,
    ff.display_order
  from public.form_fields ff
  where ff.form_id = p_source_form_id;

  return v_new_form_id;
exception
  when others then
    raise;
end;
$$;

revoke
execute on function public.duplicate_form (uuid, text, text, uuid)
from
  public,
  anon,
  authenticated;

grant
execute on function public.duplicate_form (uuid, text, text, uuid) to authenticated,
service_role;

-- 3. Enforce canWriteAdminData permission on add_member_note and delete_member_note
create or replace function public.add_member_note (
  p_user_id uuid,
  p_text text,
  p_author_id uuid,
  p_author_name text
) returns void language plpgsql security definer
set
  search_path = public as $$
begin
  if not (
    public.has_admin_permission('canWriteAdminData')
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'Unauthorized';
  end if;

  update public.users
  set notes = notes || jsonb_build_object(
    'id', gen_random_uuid(),
    'text', p_text,
    'author_id', p_author_id,
    'author_name', p_author_name,
    'created_at', now()
  )
  where id = p_user_id;
end;
$$;

revoke
execute on function public.add_member_note (uuid, text, uuid, text)
from
  public,
  anon,
  authenticated;

grant
execute on function public.add_member_note (uuid, text, uuid, text) to authenticated,
service_role;

create or replace function public.delete_member_note (p_user_id uuid, p_note_id uuid) returns void language plpgsql security definer
set
  search_path = public as $$
begin
  if not (
    public.has_admin_permission('canWriteAdminData')
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'Unauthorized';
  end if;

  update public.users
  set notes = (
    select coalesce(jsonb_agg(elem), '[]'::jsonb)
    from jsonb_array_elements(notes) as elem
    where elem->>'id' != p_note_id::text
  )
  where id = p_user_id;
end;
$$;

revoke
execute on function public.delete_member_note (uuid, uuid)
from
  public,
  anon,
  authenticated;

grant
execute on function public.delete_member_note (uuid, uuid) to authenticated,
service_role;

-- 4. Update list_approver_users to resolve approvers via admin_role_permissions
create or replace function public.list_approver_users () returns table (
  auth_user_id uuid,
  email text,
  name text,
  role text,
  avatar_object_key text
) language plpgsql security definer stable
set
  search_path = public as $$
begin
  if not (
    public.has_admin_permission('canReadAdminData')
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'unauthorized';
  end if;

  return query
  select
    a.auth_user_id,
    u.email::text,
    coalesce(
      nullif(m.full_name, ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'display_name', ''),
      split_part(u.email::text, '@', 1)
    ) as name,
    a.role::text as role,
    m.avatar_object_key
  from public.admins a
  join public.admin_role_permissions rp
    on rp.role = a.role
   and rp.permission = 'canReadAdminData'
  join auth.users u on u.id = a.auth_user_id
  left join public.users m on lower(m.email) = lower(u.email::text)
  order by name asc;
end;
$$;

revoke
execute on function public.list_approver_users ()
from
  public,
  anon,
  authenticated;

grant
execute on function public.list_approver_users () to authenticated,
service_role;

commit;
