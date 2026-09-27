begin;

-- 1. Update list_auth_users to allow all admins to search users for role assignment and notifications
create or replace function public.list_auth_users (p_search text default null) returns table (
  id uuid,
  name text,
  email text,
  avatar_object_key text,
  has_member_profile boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
) language plpgsql security definer stable
set
  search_path = public as $$
begin
  if not (
    public.is_admin()
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'unauthorized';
  end if;

  return query
  select
    u.id,
    coalesce(
      nullif(u.raw_user_meta_data ->> 'name', ''),
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'display_name', ''),
      split_part(u.email::text, '@', 1)
    ) as name,
    u.email::text,
    member.avatar_object_key,
    member.id is not null as has_member_profile,
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  left join public.users member on lower(member.email) = lower(u.email::text)
  where p_search is null
     or trim(p_search) = ''
     or u.email ilike '%' || trim(p_search) || '%'
     or (member.full_name is not null and member.full_name ilike '%' || trim(p_search) || '%')
     or (member.first_name is not null and member.first_name ilike '%' || trim(p_search) || '%')
     or (member.nickname is not null and member.nickname ilike '%' || trim(p_search) || '%')
  order by u.created_at desc;
end;
$$;

revoke
execute on function public.list_auth_users (text)
from
  public,
  anon;

grant
execute on function public.list_auth_users (text) to authenticated,
service_role;

-- 2. Update broadcast_app_notification to support member roles
create or replace function public.broadcast_app_notification (
  p_title text,
  p_message text,
  p_target_type text,
  p_target_role text default null,
  p_user_ids uuid[] default null,
  p_created_by uuid default null
) returns uuid language plpgsql security definer
set
  search_path = public as $$
declare
  v_notification_id uuid;
  v_creator_id uuid;
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

  -- 1. Create master notification record
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
    p_target_role,
    v_creator_id
  )
  returning id into v_notification_id;

  -- 2. Fan-out recipient records
  if p_target_type = 'all' then
    insert into public.app_notification_recipients (notification_id, user_id)
    select v_notification_id, u.id
    from auth.users u
    on conflict (notification_id, user_id) do nothing;

  elsif p_target_type = 'role' and p_target_role is not null then
    -- Fan-out to admins if an admin role was chosen
    insert into public.app_notification_recipients (notification_id, user_id)
    select v_notification_id, a.auth_user_id
    from public.admins a
    where a.role = p_target_role
    on conflict (notification_id, user_id) do nothing;

    -- Fan-out to members matching the service/member role via email mapping
    insert into public.app_notification_recipients (notification_id, user_id)
    select v_notification_id, au.id
    from public.users u
    join auth.users au on lower(trim(u.email)) = lower(trim(au.email::text))
    where u.email is not null
      and (
        u.role ilike '%' || trim(p_target_role) || '%'
        or trim(u.role) ilike trim(p_target_role)
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
execute on function public.broadcast_app_notification (text, text, text, text, uuid[], uuid)
from
  public,
  anon;

grant
execute on function public.broadcast_app_notification (text, text, text, text, uuid[], uuid) to authenticated,
service_role;

commit;
