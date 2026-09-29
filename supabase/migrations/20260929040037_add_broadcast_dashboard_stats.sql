begin;

create or replace function public.get_broadcast_dashboard_stats () returns json language plpgsql stable security definer
set
  search_path = public as $$
declare
  v_total_users bigint;
  v_subscribed_users bigint;
  v_campaigns json;
begin
  if not public.is_admin() then
    raise exception 'unauthorized';
  end if;

  select count(id) into v_total_users from public.users;

  select count(distinct member.id) into v_subscribed_users
  from public.users member
  join auth.users auth_user
    on lower(trim(member.email)) = lower(trim(auth_user.email::text))
  join public.user_push_subscriptions subscription
    on subscription.user_id = auth_user.id
  where member.email is not null
    and auth_user.email is not null;

  select json_agg(
    json_build_object(
      'id', n.id,
      'title', n.title,
      'message', n.message,
      'target_type', n.target_type,
      'target_role', n.target_role,
      'created_at', n.created_at,
      'total_recipients', (
        select count(id) from public.app_notification_recipients r where r.notification_id = n.id
      ),
      'read_count', (
        select count(id) from public.app_notification_recipients r where r.notification_id = n.id and r.is_read = true
      )
    ) order by n.created_at desc
  ) into v_campaigns
  from public.app_notifications n
  where n.target_type != 'user';

  return json_build_object(
    'total_users', coalesce(v_total_users, 0),
    'subscribed_users', coalesce(v_subscribed_users, 0),
    'campaigns', coalesce(v_campaigns, '[]'::json)
  );
end;
$$;

revoke
execute on function public.get_broadcast_dashboard_stats ()
from
  public,
  anon;

grant
execute on function public.get_broadcast_dashboard_stats () to authenticated;

commit;
