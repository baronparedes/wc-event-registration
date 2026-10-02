begin;

-- Drop existing functions to replace with the new signature
drop function if exists public.broadcast_app_notification (
  text,
  text,
  text,
  text,
  uuid[],
  uuid,
  text[],
  text
);

drop function if exists public.broadcast_app_notification (text, text, text, text, uuid[], uuid, text[]);

drop function if exists public.broadcast_app_notification (text, text, text, text, uuid[], uuid);

-- Recreate with p_event_id support
create or replace function public.broadcast_app_notification (
  p_title text,
  p_message text,
  p_target_type text,
  p_target_role text default null,
  p_user_ids uuid[] default null,
  p_created_by uuid default null,
  p_target_roles text[] default null,
  p_target_url text default null,
  p_event_id uuid default null
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

  if p_target_type not in ('all', 'role', 'user', 'event') then
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

  -- 1. Create master notification record
  insert into public.app_notifications (
    title,
    message,
    target_type,
    target_role,
    created_by,
    target_url
  )
  values (
    trim(p_title),
    trim(p_message),
    p_target_type,
    case
      when p_target_type = 'event' and p_event_id is not null then p_event_id::text
      when v_roles is not null and array_length(v_roles, 1) > 0 then array_to_string(v_roles, ', ')
      else null
    end,
    v_creator_id,
    p_target_url
  )
  returning id into v_notification_id;

  -- 2. Fan-out recipient records
  if p_target_type = 'all' then
    insert into public.app_notification_recipients (notification_id, user_id)
    select v_notification_id, u.id
    from auth.users u
    on conflict (notification_id, user_id) do nothing;

  elsif p_target_type = 'role' and v_roles is not null then
    -- Fan-out to admins if admin roles are selected
    insert into public.app_notification_recipients (notification_id, user_id)
    select distinct v_notification_id, a.auth_user_id
    from public.admins a
    where a.role = any(v_roles)
    on conflict (notification_id, user_id) do nothing;

    -- Fan-out to members matching any of the service/member roles via email mapping
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

  elsif p_target_type = 'event' and p_event_id is not null then
    -- Fan-out to registered members of the event who have an auth user account
    insert into public.app_notification_recipients (notification_id, user_id)
    select distinct v_notification_id, au.id
    from public.registrations r
    join public.users u on u.id = r.user_id
    join auth.users au on lower(trim(u.email)) = lower(trim(au.email::text))
    where r.event_id = p_event_id
      and r.status != 'cancelled'
      and u.email is not null
    on conflict (notification_id, user_id) do nothing;
  end if;

  return v_notification_id;
end;
$$;

revoke
execute on function public.broadcast_app_notification (
  text,
  text,
  text,
  text,
  uuid[],
  uuid,
  text[],
  text,
  uuid
)
from
  public,
  anon;

grant
execute on function public.broadcast_app_notification (
  text,
  text,
  text,
  text,
  uuid[],
  uuid,
  text[],
  text,
  uuid
) to authenticated,
service_role;

-- Create helper function to get audience stats before broadcasting
create or replace function public.get_broadcast_audience_stats (
  p_target_type text,
  p_target_roles text[] default null,
  p_user_id uuid default null,
  p_event_id uuid default null
) returns jsonb language plpgsql security definer stable
set
  search_path = public as $$
declare
  v_total_recipients integer := 0;
  v_email_recipients_count integer := 0;
  v_push_recipients_count integer := 0;
  v_registered_members_count integer := 0;
  v_public_registrants_count integer := 0;
  v_roles text[];
begin
  if not (
    public.is_admin()
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'unauthorized';
  end if;

  if p_target_roles is not null and array_length(p_target_roles, 1) > 0 then
    v_roles := p_target_roles;
  else
    v_roles := null;
  end if;

  if p_target_type = 'event' and p_event_id is not null then
    -- Registered members
    select count(distinct r.id)
    into v_registered_members_count
    from public.registrations r
    where r.event_id = p_event_id
      and r.status != 'cancelled';

    -- Public registrants
    select count(distinct pr.id)
    into v_public_registrants_count
    from public.public_registrations pr
    where pr.event_id = p_event_id
      and pr.status != 'cancelled';

    v_total_recipients := coalesce(v_registered_members_count, 0) + coalesce(v_public_registrants_count, 0);

    -- Valid emails (combined and deduplicated)
    with combined_emails as (
      select lower(trim(u.email)) as email
      from public.registrations r
      join public.users u on u.id = r.user_id
      where r.event_id = p_event_id
        and r.status != 'cancelled'
        and u.email is not null
        and trim(u.email) <> ''
      union
      select lower(trim(pr.email)) as email
      from public.public_registrations pr
      where pr.event_id = p_event_id
        and pr.status != 'cancelled'
        and pr.email is not null
        and trim(pr.email) <> ''
    )
    select count(distinct email)
    into v_email_recipients_count
    from combined_emails;

    -- Push subscriptions for registered members who have an auth user and push subscription
    select count(distinct s.user_id)
    into v_push_recipients_count
    from public.registrations r
    join public.users u on u.id = r.user_id
    join auth.users au on lower(trim(u.email)) = lower(trim(au.email::text))
    join public.user_push_subscriptions s on s.user_id = au.id
    where r.event_id = p_event_id
      and r.status != 'cancelled'
      and u.email is not null;

  elsif p_target_type = 'all' then
    select count(distinct id)
    into v_registered_members_count
    from public.users;

    v_total_recipients := coalesce(v_registered_members_count, 0);

    select count(distinct lower(trim(email)))
    into v_email_recipients_count
    from public.users
    where email is not null and trim(email) <> '';

    select count(distinct s.user_id)
    into v_push_recipients_count
    from public.users u
    join auth.users au on lower(trim(u.email)) = lower(trim(au.email::text))
    join public.user_push_subscriptions s on s.user_id = au.id
    where u.email is not null;

  elsif p_target_type = 'role' and v_roles is not null then
    with role_users as (
      select distinct au.id as auth_user_id, lower(trim(u.email)) as email
      from public.users u
      join auth.users au on lower(trim(u.email)) = lower(trim(au.email::text))
      cross join unnest(v_roles) as r_target
      where u.email is not null
        and (
          u.role ilike '%' || trim(r_target) || '%'
          or trim(u.role) ilike trim(r_target)
        )
      union
      select distinct a.auth_user_id, lower(trim(au.email::text)) as email
      from public.admins a
      join auth.users au on au.id = a.auth_user_id
      where a.role = any(v_roles)
    )
    select
      count(*),
      count(distinct email) filter (where email is not null and trim(email) <> ''),
      count(distinct s.user_id)
    into
      v_total_recipients,
      v_email_recipients_count,
      v_push_recipients_count
    from role_users ru
    left join public.user_push_subscriptions s on s.user_id = ru.auth_user_id;

  elsif p_target_type = 'user' and p_user_id is not null then
    v_total_recipients := 1;

    select count(distinct lower(trim(au.email::text)))
    into v_email_recipients_count
    from auth.users au
    where au.id = p_user_id
      and au.email is not null
      and trim(au.email::text) <> '';

    select count(distinct s.user_id)
    into v_push_recipients_count
    from public.user_push_subscriptions s
    where s.user_id = p_user_id;
  end if;

  return jsonb_build_object(
    'total_recipients', coalesce(v_total_recipients, 0),
    'email_recipients_count', coalesce(v_email_recipients_count, 0),
    'push_recipients_count', coalesce(v_push_recipients_count, 0),
    'registered_members_count', coalesce(v_registered_members_count, 0),
    'public_registrants_count', coalesce(v_public_registrants_count, 0)
  );
end;
$$;

revoke
execute on function public.get_broadcast_audience_stats (text, text[], uuid, uuid)
from
  public,
  anon;

grant
execute on function public.get_broadcast_audience_stats (text, text[], uuid, uuid) to authenticated,
service_role;

commit;
