create or replace function public.get_broadcast_dashboard_stats () returns json language plpgsql security definer as $$
declare
  v_total_users integer;
  v_subscribed_users integer;
  v_campaigns json;
begin
  if not public.is_admin() then
    raise exception 'unauthorized';
  end if;

  select count(id) into v_total_users from auth.users;
  select count(distinct user_id) into v_subscribed_users from public.user_push_subscriptions;

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

grant
execute on function public.get_broadcast_dashboard_stats () to authenticated;
