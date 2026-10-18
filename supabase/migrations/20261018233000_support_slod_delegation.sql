begin;

-- 1. Create list_slod_users RPC for admins to view potential SLOD reviewers
create or replace function public.list_slod_users () returns table (
  auth_user_id uuid,
  email text,
  name text,
  avatar_object_key text
) language plpgsql security definer stable
set
  search_path = public as $$
begin
  if not (
    public.is_admin_viewer()
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
    m.avatar_object_key
  from public.admins a
  join auth.users u on u.id = a.auth_user_id
  left join public.users m on lower(m.email) = lower(u.email::text)
  where a.role = 'slod'
  order by name asc;
end;
$$;

revoke
execute on function public.list_slod_users ()
from
  public,
  anon;

grant
execute on function public.list_slod_users () to authenticated,
service_role;

-- 2. Create delegate_approval_request RPC
create or replace function public.delegate_approval_request (
  p_approval_id uuid,
  p_assigned_to_email text,
  p_assigned_to_user_id uuid default null
) returns jsonb language plpgsql security definer
set
  search_path = public as $$
declare
  v_approval public.approval_requests%rowtype;
  v_resolved_user_id uuid;
begin
  if not (
    public.is_admin()
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'unauthorized';
  end if;

  select * into v_approval
  from public.approval_requests
  where id = p_approval_id
  for update;

  if not found then
    raise exception 'Approval request not found';
  end if;

  if v_approval.status <> 'pending' then
    return jsonb_build_object(
      'success', false,
      'error', 'Cannot delegate request that is not pending',
      'status', v_approval.status::text
    );
  end if;

  -- Resolve auth_user_id if not explicitly provided
  v_resolved_user_id := p_assigned_to_user_id;
  if v_resolved_user_id is null and p_assigned_to_email is not null then
    select id into v_resolved_user_id
    from auth.users
    where lower(email) = lower(trim(p_assigned_to_email))
    limit 1;
  end if;

  update public.approval_requests
  set assigned_to_email = lower(trim(p_assigned_to_email)),
      assigned_to_user_id = v_resolved_user_id,
      updated_at = now()
  where id = p_approval_id;

  return jsonb_build_object(
    'success', true,
    'approval_id', p_approval_id,
    'assigned_to_email', lower(trim(p_assigned_to_email)),
    'assigned_to_user_id', v_resolved_user_id,
    'title', v_approval.title,
    'access_token', v_approval.access_token,
    'requester_name', v_approval.requester_name,
    'requester_email', v_approval.requester_email,
    'summary', v_approval.summary,
    'entity_type', v_approval.entity_type::text
  );
end;
$$;

revoke
execute on function public.delegate_approval_request (uuid, text, uuid)
from
  public,
  anon;

grant
execute on function public.delegate_approval_request (uuid, text, uuid) to authenticated,
service_role;

commit;
