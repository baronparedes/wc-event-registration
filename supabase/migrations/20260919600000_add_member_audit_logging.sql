begin;

-- Audit trigger function for members (users table)
create or replace function public.audit_members_trigger () returns trigger as $$
declare
  v_admin_id uuid;
  v_action text;
  v_metadata jsonb := '{}'::jsonb;
begin
  v_admin_id := public.get_current_admin_id();

  if TG_OP = 'INSERT' then
    v_action := 'create_member';
    v_metadata := jsonb_build_object(
      'member_id', new.member_id,
      'full_name', new.full_name,
      'email', new.email,
      'role', new.role,
      'category', new.category
    );

    insert into public.admin_audit_logs (admin_id, action, resource_type, resource_id, metadata)
    values (v_admin_id, v_action, 'member', new.id::text, v_metadata);

  elsif TG_OP = 'UPDATE' then
    declare
      v_changed_fields jsonb := public.jsonb_diff(to_jsonb(old), to_jsonb(new));
    begin
      if old.is_active is distinct from new.is_active then
        if new.is_active = false then
          v_action := 'soft_delete_member';
        else
          v_action := 'restore_member';
        end if;
        v_metadata := jsonb_build_object(
          'member_id', new.member_id,
          'full_name', new.full_name,
          'previous_is_active', old.is_active,
          'next_is_active', new.is_active,
          'changed_fields', v_changed_fields
        );
      else
        v_action := 'update_member';
        v_metadata := jsonb_build_object(
          'member_id', new.member_id,
          'full_name', new.full_name,
          'changed_fields', v_changed_fields
        );
      end if;
    end;

    insert into public.admin_audit_logs (admin_id, action, resource_type, resource_id, metadata)
    values (v_admin_id, v_action, 'member', new.id::text, v_metadata);
  end if;

  return null; -- AFTER trigger
end;
$$ language plpgsql security definer;

create trigger tr_audit_members
after insert or update on public.users for each row
execute function public.audit_members_trigger ();

commit;
