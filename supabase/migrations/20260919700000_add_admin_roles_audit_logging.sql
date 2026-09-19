begin;

-- Enhance get_current_admin_id to support service_role edge functions forwarding x-admin-id
create or replace function public.get_current_admin_id () returns uuid as $$
declare
  v_admin_id uuid;
  v_header_admin_id text;
begin
  -- 1. Try resolving via auth.uid() (standard user session)
  select id into v_admin_id from public.admins where auth_user_id = auth.uid();
  if v_admin_id is not null then
    return v_admin_id;
  end if;

  -- 2. Try resolving via x-admin-id header for trusted service_role calls (e.g. Edge Functions)
  if current_user = 'service_role' then
    begin
      v_header_admin_id := current_setting('request.headers', true)::jsonb ->> 'x-admin-id';
      if v_header_admin_id is not null and v_header_admin_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select id into v_admin_id
        from public.admins
        where id = v_header_admin_id::uuid or auth_user_id = v_header_admin_id::uuid
        limit 1;

        if v_admin_id is not null then
          return v_admin_id;
        end if;
      end if;
    exception when others then
      null;
    end;
  end if;

  return null;
end;
$$ language plpgsql security definer;

-- Audit trigger function for admin roles (admins table)
create or replace function public.audit_admins_trigger () returns trigger as $$
declare
  v_admin_id uuid;
  v_action text;
  v_metadata jsonb := '{}'::jsonb;
begin
  v_admin_id := public.get_current_admin_id();

  if TG_OP = 'INSERT' then
    v_action := 'assign_admin_role';
    v_metadata := jsonb_build_object(
      'auth_user_id', new.auth_user_id,
      'role', new.role
    );

    insert into public.admin_audit_logs (admin_id, action, resource_type, resource_id, metadata)
    values (v_admin_id, v_action, 'admin_role', new.id::text, v_metadata);

  elsif TG_OP = 'UPDATE' then
    v_action := 'update_admin_role';
    v_metadata := jsonb_build_object(
      'auth_user_id', new.auth_user_id,
      'role', new.role,
      'previous_role', old.role,
      'next_role', new.role,
      'changed_fields', public.jsonb_diff(to_jsonb(old), to_jsonb(new))
    );

    insert into public.admin_audit_logs (admin_id, action, resource_type, resource_id, metadata)
    values (v_admin_id, v_action, 'admin_role', new.id::text, v_metadata);

  elsif TG_OP = 'DELETE' then
    v_action := 'revoke_admin_role';
    v_metadata := jsonb_build_object(
      'auth_user_id', old.auth_user_id,
      'revoked_role', old.role
    );

    insert into public.admin_audit_logs (admin_id, action, resource_type, resource_id, metadata)
    values (v_admin_id, v_action, 'admin_role', old.id::text, v_metadata);
  end if;

  return null; -- AFTER trigger
end;
$$ language plpgsql security definer;

create trigger tr_audit_admins
after insert or update or delete on public.admins for each row
execute function public.audit_admins_trigger ();

commit;
