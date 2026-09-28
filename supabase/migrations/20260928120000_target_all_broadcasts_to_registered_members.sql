begin;

create or replace function public.broadcast_app_notification (
  p_title text,
  p_message text,
  p_target_type text,
  p_target_role text default null,
  p_user_ids uuid[] default null,
  p_created_by uuid default null,
  p_target_roles text[] default null
) returns uuid language plpgsql security definer
set
  search_path = public as $$
declare
  v_notification_id uuid;
  v_creator_id uuid;
  v_roles text[];
begin
  if not (
    public.is_admin()
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'unauthorized';
  end if;

  if p_target_type not in ('all', 'role', 'user') then
    raise exception 'invalid target_type: %', p_target_type;
  end if;

  v_creator_id := coalesce(p_created_by, auth.uid());

  if p_target_roles is not null and array_length(p_target_roles, 1) > 0 then
    v_roles := p_target_roles;
  elsif p_target_role is not null and trim(p_target_role) <> '' then
    v_roles := array[p_target_role];
  else
    v_roles := null;
  end if;

  insert into public.app_notifications (
    title,
    message,
    target_type,
    target_role,
    created_by
  )
  values (
    trim(p_title),
    trim(p_message),
    p_target_type,
    case
      when v_roles is not null and array_length(v_roles, 1) > 0 then array_to_string(v_roles, ', ')
      else null
    end,
    v_creator_id
  )
  returning id into v_notification_id;

  if p_target_type = 'all' then
    insert into public.app_notification_recipients (notification_id, user_id)
    select distinct v_notification_id, auth_user.id
    from auth.users auth_user
    join public.users member
      on lower(trim(member.email)) = lower(trim(auth_user.email::text))
    where member.email is not null
      and auth_user.email is not null
    on conflict (notification_id, user_id) do nothing;

  elsif p_target_type = 'role' and v_roles is not null then
    insert into public.app_notification_recipients (notification_id, user_id)
    select distinct v_notification_id, a.auth_user_id
    from public.admins a
    where a.role = any(v_roles)
    on conflict (notification_id, user_id) do nothing;

    insert into public.app_notification_recipients (notification_id, user_id)
    select distinct v_notification_id, au.id
    from public.users u
    join auth.users au on lower(trim(u.email)) = lower(trim(au.email::text))
    cross join unnest(v_roles) as r_target
    where u.email is not null
      and (
        u.role ilike '%' || trim(r_target) || '%'
        or trim(u.role) ilike trim(r_target)
      )
    on conflict (notification_id, user_id) do nothing;

  elsif p_target_type = 'user' and p_user_ids is not null then
    insert into public.app_notification_recipients (notification_id, user_id)
    select v_notification_id, u_id
    from unnest(p_user_ids) as u_id
    on conflict (notification_id, user_id) do nothing;
  end if;

  return v_notification_id;
end;
$$;

revoke
execute on function public.broadcast_app_notification (text, text, text, text, uuid[], uuid, text[])
from
  public,
  anon;

grant
execute on function public.broadcast_app_notification (text, text, text, text, uuid[], uuid, text[]) to authenticated,
service_role;

commit;
