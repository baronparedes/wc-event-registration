begin;

select
  extensions.plan (11);

create temporary table broadcast_dashboard_stats_baseline as
select
  (
    select
      count(id)
    from
      public.users
  )::bigint as member_count,
  (
    select
      count(distinct member.id)
    from
      public.users member
      join auth.users auth_user on lower(trim(member.email)) = lower(trim(auth_user.email::text))
      join public.user_push_subscriptions subscription on subscription.user_id = auth_user.id
    where
      member.email is not null
      and auth_user.email is not null
  )::bigint as subscribed_member_count;

create temporary table broadcast_dashboard_stats_fixture as
select
  gen_random_uuid() as admin_user_id,
  gen_random_uuid() as subscribed_user_id,
  gen_random_uuid() as unlinked_user_id,
  gen_random_uuid() as subscribed_member_id,
  gen_random_uuid() as no_login_member_id,
  gen_random_uuid() as all_campaign_id,
  gen_random_uuid() as role_campaign_id,
  gen_random_uuid() as user_campaign_id;

create temporary table broadcast_dashboard_stats_results (
  assertion_name text primary key,
  passed boolean not null
);

insert into
  auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  )
select
  '00000000-0000-0000-0000-000000000000',
  user_fixture.id,
  'authenticated',
  'authenticated',
  user_fixture.email,
  'not-used',
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}'
from
  (
    select
      admin_user_id as id,
      admin_user_id::text || '@example.invalid' as email
    from
      broadcast_dashboard_stats_fixture
    union all
    select
      subscribed_user_id,
      subscribed_user_id::text || '@example.invalid'
    from
      broadcast_dashboard_stats_fixture
    union all
    select
      unlinked_user_id,
      unlinked_user_id::text || '@example.invalid'
    from
      broadcast_dashboard_stats_fixture
  ) user_fixture;

insert into
  public.admins (auth_user_id, role)
select
  admin_user_id,
  'admin'
from
  broadcast_dashboard_stats_fixture;

insert into
  public.users (id, member_id, full_name, email)
select
  subscribed_member_id,
  'dashboard-stats-' || subscribed_member_id::text,
  'Test Dashboard Subscriber',
  subscribed_user_id::text || '@example.invalid'
from
  broadcast_dashboard_stats_fixture
union all
select
  no_login_member_id,
  'dashboard-stats-' || no_login_member_id::text,
  'Test Dashboard Member Without Login',
  no_login_member_id::text || '@example.invalid'
from
  broadcast_dashboard_stats_fixture;

insert into
  public.user_push_subscriptions (user_id, endpoint, auth_key, p256dh_key)
select
  subscribed_user_id,
  'https://push.example.invalid/' || subscribed_user_id::text,
  'test-auth-key',
  'test-p256dh-key'
from
  broadcast_dashboard_stats_fixture
union all
select
  unlinked_user_id,
  'https://push.example.invalid/' || unlinked_user_id::text,
  'test-auth-key',
  'test-p256dh-key'
from
  broadcast_dashboard_stats_fixture;

insert into
  public.user_push_subscriptions (user_id, endpoint, auth_key, p256dh_key)
select
  subscribed_user_id,
  'https://push.example.invalid/second-device/' || subscribed_user_id::text,
  'test-auth-key-2',
  'test-p256dh-key-2'
from
  broadcast_dashboard_stats_fixture;

insert into
  public.app_notifications (id, title, message, target_type, created_by)
select
  all_campaign_id,
  'Test all campaign',
  'Test campaign message',
  'all',
  admin_user_id
from
  broadcast_dashboard_stats_fixture
union all
select
  role_campaign_id,
  'Test role campaign',
  'Test role campaign message',
  'role',
  admin_user_id
from
  broadcast_dashboard_stats_fixture
union all
select
  user_campaign_id,
  'Test user campaign',
  'Test user message',
  'user',
  admin_user_id
from
  broadcast_dashboard_stats_fixture;

insert into
  public.app_notification_recipients (notification_id, user_id, is_read)
select
  all_campaign_id,
  subscribed_user_id,
  false
from
  broadcast_dashboard_stats_fixture
union all
select
  role_campaign_id,
  subscribed_user_id,
  false
from
  broadcast_dashboard_stats_fixture
union all
select
  role_campaign_id,
  unlinked_user_id,
  true
from
  broadcast_dashboard_stats_fixture
union all
select
  all_campaign_id,
  unlinked_user_id,
  true
from
  broadcast_dashboard_stats_fixture;

do $$
begin
  perform set_config(
    'request.jwt.claims',
    (
      select json_build_object('sub', admin_user_id, 'role', 'authenticated')::text
      from broadcast_dashboard_stats_fixture
    ),
    true
  );
end;
$$;

do $$
declare
  v_fixture record;
  v_baseline record;
  v_stats json;
  v_total_recipients bigint;
  v_read_count bigint;
  v_role_total_recipients bigint;
  v_role_read_count bigint;
  v_campaign_present boolean;
  v_role_campaign_present boolean;
  v_user_campaign_excluded boolean;
  v_unauthorized boolean := false;
begin
  select * into v_fixture from broadcast_dashboard_stats_fixture;
  select * into v_baseline from broadcast_dashboard_stats_baseline;
  v_stats := public.get_broadcast_dashboard_stats();

  insert into broadcast_dashboard_stats_results (assertion_name, passed)
  values
    (
      'Dashboard total uses all member profiles, including members without auth accounts',
      (v_stats ->> 'total_users')::bigint = v_baseline.member_count + 2
    ),
    (
      'Dashboard subscriber count includes only subscribed accounts linked to members',
      (v_stats ->> 'subscribed_users')::bigint = v_baseline.subscribed_member_count + 1
    );

  select
    (campaign ->> 'total_recipients')::bigint,
    (campaign ->> 'read_count')::bigint
  into v_total_recipients, v_read_count
  from json_array_elements(v_stats -> 'campaigns') as item(campaign)
  where campaign ->> 'id' = v_fixture.all_campaign_id::text;

  insert into broadcast_dashboard_stats_results (assertion_name, passed)
  values
    ('Dashboard reports all campaign recipients', v_total_recipients = 2),
    ('Dashboard reports read campaign recipients', v_read_count = 1);

  select exists (
    select 1
    from json_array_elements(v_stats -> 'campaigns') as item(campaign)
    where campaign ->> 'id' = v_fixture.all_campaign_id::text
  ) into v_campaign_present;
  insert into broadcast_dashboard_stats_results (assertion_name, passed)
  values ('Dashboard includes an all-members campaign', v_campaign_present);

  select
    (campaign ->> 'total_recipients')::bigint,
    (campaign ->> 'read_count')::bigint
  into v_role_total_recipients, v_role_read_count
  from json_array_elements(v_stats -> 'campaigns') as item(campaign)
  where campaign ->> 'id' = v_fixture.role_campaign_id::text;

  select exists (
    select 1
    from json_array_elements(v_stats -> 'campaigns') as item(campaign)
    where campaign ->> 'id' = v_fixture.role_campaign_id::text
  ) into v_role_campaign_present;
  insert into broadcast_dashboard_stats_results (assertion_name, passed)
  values
    ('Dashboard includes a role-targeted campaign', v_role_campaign_present),
    (
      'Dashboard reports role campaign recipients and reads',
      v_role_total_recipients = 2 and v_role_read_count = 1
    );

  select not exists (
    select 1
    from json_array_elements(v_stats -> 'campaigns') as item(campaign)
    where campaign ->> 'id' = v_fixture.user_campaign_id::text
  ) into v_user_campaign_excluded;
  insert into broadcast_dashboard_stats_results (assertion_name, passed)
  values ('Dashboard excludes user-targeted campaigns', v_user_campaign_excluded);

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_fixture.unlinked_user_id, 'role', 'authenticated')::text,
    true
  );
  begin
    perform public.get_broadcast_dashboard_stats();
  exception
    when raise_exception then
      v_unauthorized := sqlerrm = 'unauthorized';
  end;
  insert into broadcast_dashboard_stats_results (assertion_name, passed)
  values ('Dashboard RPC rejects non-admin callers', v_unauthorized);
end;
$$;

select
  extensions.ok (passed, assertion_name)
from
  broadcast_dashboard_stats_results
order by
  assertion_name;

select
  extensions.ok (
    not has_function_privilege(
      'anon',
      'public.get_broadcast_dashboard_stats()',
      'EXECUTE'
    ),
    'Dashboard RPC is not executable by anon'
  );

select
  extensions.ok (
    has_function_privilege(
      'authenticated',
      'public.get_broadcast_dashboard_stats()',
      'EXECUTE'
    ),
    'Dashboard RPC is executable by authenticated users'
  );

select
  *
from
  extensions.finish ();

rollback;
