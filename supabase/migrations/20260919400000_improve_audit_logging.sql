begin;

-- 1. Remove CHECK constraints for scalability
alter table public.admin_audit_logs
drop constraint if exists admin_audit_logs_action_allowed,
drop constraint if exists admin_audit_logs_resource_type_allowed;

-- 2. Enforce immutability (append-only)
create or replace function public.prevent_audit_log_modification () returns trigger as $$
begin
  raise exception 'Audit logs are immutable and cannot be updated or deleted.' using errcode = '20000';
end;
$$ language plpgsql;

create trigger tr_admin_audit_logs_immutable
before update or delete on public.admin_audit_logs for each row
execute function public.prevent_audit_log_modification ();

-- 3. Helper to get admin ID from current auth user
create or replace function public.get_current_admin_id () returns uuid as $$
declare
  v_admin_id uuid;
begin
  select id into v_admin_id from public.admins where auth_user_id = auth.uid();
  return v_admin_id;
end;
$$ language plpgsql security definer;

-- 4. Helper to compute JSON diff between old and new records (recursively diffing nested objects)
create or replace function public.jsonb_diff (
  val_old jsonb,
  val_new jsonb,
  ignored_keys text[] default array['updated_at']
) returns jsonb as $$
declare
  v_key text;
  v_old_val jsonb;
  v_new_val jsonb;
  v_nested_diff jsonb;
  v_diff jsonb := '{}'::jsonb;
begin
  if val_old is null and val_new is null then
    return '{}'::jsonb;
  end if;

  val_old := coalesce(val_old, '{}'::jsonb);
  val_new := coalesce(val_new, '{}'::jsonb);

  for v_key in select jsonb_object_keys(val_old || val_new) loop
    if not (v_key = any(ignored_keys)) then
      v_old_val := val_old -> v_key;
      v_new_val := val_new -> v_key;

      if v_old_val is distinct from v_new_val then
        if jsonb_typeof(v_old_val) = 'object' and jsonb_typeof(v_new_val) = 'object' then
          v_nested_diff := public.jsonb_diff(v_old_val, v_new_val, array[]::text[]);
          if v_nested_diff != '{}'::jsonb then
            v_diff := v_diff || jsonb_build_object(v_key, v_nested_diff);
          end if;
        else
          v_diff := v_diff || jsonb_build_object(
            v_key,
            jsonb_build_object('old', v_old_val, 'new', v_new_val)
          );
        end if;
      end if;
    end if;
  end loop;

  return v_diff;
end;
$$ language plpgsql immutable;

-- 5. Audit trigger for events
create or replace function public.audit_events_trigger () returns trigger as $$
declare
  v_admin_id uuid;
  v_action text;
  v_metadata jsonb := '{}'::jsonb;
  v_changed_fields jsonb;
begin
  v_admin_id := public.get_current_admin_id();

  -- If we can't determine the admin (e.g. system action), we might still want to log it, or skip.
  -- The previous frontend code only logged if adminId was present.
  -- Let's allow null admin_id (it's already allowed by the schema `on delete set null` but is it nullable initially? Yes).

  if TG_OP = 'INSERT' then
    v_action := 'create_event';
    v_metadata := jsonb_build_object('slug', new.slug, 'title', new.title, 'status', new.status);

    insert into public.admin_audit_logs (admin_id, action, resource_type, resource_id, metadata)
    values (coalesce(new.created_by_admin_id, v_admin_id), v_action, 'event', new.id::text, v_metadata);

  elsif TG_OP = 'UPDATE' then
    v_changed_fields := public.jsonb_diff(to_jsonb(old), to_jsonb(new));

    -- Determine specific actions based on status changes if needed, or just generic update
    if old.status != new.status then
      if new.status = 'published' then
        v_action := 'publish_event';
      elsif new.status = 'archived' then
        v_action := 'archive_event';
      elsif new.status = 'draft' then
        v_action := 'update_event'; -- or restore_to_draft
      else
        v_action := 'update_event';
      end if;
      v_metadata := jsonb_build_object(
        'title', new.title,
        'slug', new.slug,
        'previous_status', old.status,
        'next_status', new.status,
        'changed_fields', v_changed_fields
      );
    else
      v_action := 'update_event';
      v_metadata := jsonb_build_object(
        'title', new.title,
        'slug', new.slug,
        'changed_fields', v_changed_fields
      );
    end if;

    insert into public.admin_audit_logs (admin_id, action, resource_type, resource_id, metadata)
    values (v_admin_id, v_action, 'event', new.id::text, v_metadata);
  end if;

  return null; -- AFTER trigger
end;
$$ language plpgsql security definer;

create trigger tr_audit_events
after insert or update on public.events for each row
execute function public.audit_events_trigger ();

-- 6. Audit trigger for forms
create or replace function public.audit_forms_trigger () returns trigger as $$
declare
  v_admin_id uuid;
  v_action text;
  v_metadata jsonb := '{}'::jsonb;
  v_changed_fields jsonb;
begin
  v_admin_id := public.get_current_admin_id();

  if TG_OP = 'INSERT' then
    v_action := 'create_form';
    v_metadata := jsonb_build_object('slug', new.slug, 'title', new.title, 'status', new.status);

    insert into public.admin_audit_logs (admin_id, action, resource_type, resource_id, metadata)
    values (coalesce(new.created_by_admin_id, v_admin_id), v_action, 'form', new.id::text, v_metadata);

  elsif TG_OP = 'UPDATE' then
    v_action := 'update_form';
    v_changed_fields := public.jsonb_diff(to_jsonb(old), to_jsonb(new));

    if old.status != new.status then
      v_metadata := jsonb_build_object(
        'title', new.title,
        'slug', new.slug,
        'previous_status', old.status,
        'next_status', new.status,
        'changed_fields', v_changed_fields
      );
    else
      v_metadata := jsonb_build_object(
        'title', new.title,
        'slug', new.slug,
        'changed_fields', v_changed_fields
      );
    end if;

    insert into public.admin_audit_logs (admin_id, action, resource_type, resource_id, metadata)
    values (v_admin_id, v_action, 'form', new.id::text, v_metadata);
  end if;

  return null; -- AFTER trigger
end;
$$ language plpgsql security definer;

create trigger tr_audit_forms
after insert or update on public.forms for each row
execute function public.audit_forms_trigger ();

commit;
