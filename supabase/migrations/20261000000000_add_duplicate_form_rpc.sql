begin;

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
    -- Re-raise exception to ensure complete transaction rollback
    raise;
end;
$$;

grant
execute on function public.duplicate_form (uuid, text, text, uuid) to authenticated;

grant
execute on function public.duplicate_form (uuid, text, text, uuid) to service_role;

commit;
