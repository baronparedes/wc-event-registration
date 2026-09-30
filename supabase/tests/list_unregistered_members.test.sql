begin;

create temporary table list_unregistered_members_fixture (
  event_id uuid not null,
  active_user_id uuid not null,
  cancelled_user_id uuid not null,
  unregistered_user_id uuid not null
) on
commit
drop;

grant
select
  on list_unregistered_members_fixture to authenticated;

insert into
  list_unregistered_members_fixture
values
  (
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid()
  );

insert into
  public.events (id, slug, title)
select
  event_id,
  'unregistered-' || event_id::text,
  'Unregistered members test'
from
  list_unregistered_members_fixture;

insert into
  public.users (id, member_id, full_name, first_name)
select
  active_user_id,
  'unreg-' || event_id::text || '-active',
  'Active Registration',
  'Active'
from
  list_unregistered_members_fixture
union all
select
  cancelled_user_id,
  'unreg-' || event_id::text || '-cancelled',
  'Cancelled Registration',
  'Cancelled'
from
  list_unregistered_members_fixture
union all
select
  unregistered_user_id,
  'unreg-' || event_id::text || '-never',
  'Literal 100%_ ' || event_id::text,
  'Literal'
from
  list_unregistered_members_fixture;

insert into
  public.registrations (event_id, user_id, status)
select
  event_id,
  active_user_id,
  'submitted'::public.registration_status
from
  list_unregistered_members_fixture
union all
select
  event_id,
  cancelled_user_id,
  'cancelled'::public.registration_status
from
  list_unregistered_members_fixture;

insert into
  auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  )
values
  (
    '00000000-0000-0000-0000-00000000ee10',
    'list-unregistered-admin@test.local',
    'not-used',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  ),
  (
    '00000000-0000-0000-0000-00000000ee11',
    'list-unregistered-slod@test.local',
    'not-used',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  ),
  (
    '00000000-0000-0000-0000-00000000ee12',
    'list-unregistered-super-admin@test.local',
    'not-used',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  );

insert into
  public.admins (auth_user_id, role)
values
  ('00000000-0000-0000-0000-00000000ee10', 'admin'),
  ('00000000-0000-0000-0000-00000000ee11', 'slod'),
  (
    '00000000-0000-0000-0000-00000000ee12',
    'super_admin'
  );

select
  extensions.plan (13);

set
  local "request.jwt.claims" to '{"role":"service_role"}';

select
  extensions.is (
    (
      select
        total_count
      from
        public.list_unregistered_members (
          (
            select
              event_id
            from
              list_unregistered_members_fixture
          ),
          20,
          0,
          'unreg-' || (
            select
              event_id::text
            from
              list_unregistered_members_fixture
          )
        )
    ),
    2::bigint,
    'only active event registrations are excluded from the total'
  );

select
  extensions.ok (
    (
      select
        items @> jsonb_build_array(jsonb_build_object('id', cancelled_user_id))
      from
        list_unregistered_members_fixture as fixture
        cross join lateral public.list_unregistered_members (
          fixture.event_id,
          20,
          0,
          'unreg-' || fixture.event_id::text
        ) as result
    ),
    'cancelled registrations remain in the unregistered member list'
  );

select
  extensions.ok (
    (
      select
        items @> jsonb_build_array(jsonb_build_object('id', unregistered_user_id))
      from
        list_unregistered_members_fixture as fixture
        cross join lateral public.list_unregistered_members (
          fixture.event_id,
          20,
          0,
          'unreg-' || fixture.event_id::text
        ) as result
    ),
    'members with no event registration remain in the list'
  );

select
  extensions.ok (
    not (
      select
        items @> jsonb_build_array(jsonb_build_object('id', active_user_id))
      from
        list_unregistered_members_fixture as fixture
        cross join lateral public.list_unregistered_members (
          fixture.event_id,
          20,
          0,
          'unreg-' || fixture.event_id::text
        ) as result
    ),
    'submitted registrations are excluded'
  );

select
  extensions.is (
    (
      select
        total_count
      from
        list_unregistered_members_fixture as fixture
        cross join lateral public.list_unregistered_members (
          fixture.event_id,
          20,
          0,
          '100%_ ' || fixture.event_id::text
        ) as result
    ),
    1::bigint,
    'percent and underscore in the search term are treated literally'
  );

select
  extensions.is (
    (
      select
        jsonb_array_length(items)
      from
        list_unregistered_members_fixture as fixture
        cross join lateral public.list_unregistered_members (
          fixture.event_id,
          1,
          100,
          'unreg-' || fixture.event_id::text
        ) as result
    ),
    0,
    'an empty page returns no items'
  );

select
  extensions.is (
    (
      select
        total_count
      from
        list_unregistered_members_fixture as fixture
        cross join lateral public.list_unregistered_members (
          fixture.event_id,
          1,
          100,
          'unreg-' || fixture.event_id::text
        ) as result
    ),
    2::bigint,
    'the total count remains available when the requested page is empty'
  );

select
  extensions.ok (
    not has_function_privilege(
      'anon',
      'public.list_unregistered_members(uuid,integer,integer,text)',
      'execute'
    ),
    'anon cannot execute the internal list RPC'
  );

select
  extensions.ok (
    has_function_privilege(
      'service_role',
      'public.list_unregistered_members(uuid,integer,integer,text)',
      'execute'
    ),
    'service_role can execute the list RPC'
  );

select
  extensions.ok (
    has_function_privilege(
      'authenticated',
      'public.list_unregistered_members(uuid,integer,integer,text)',
      'execute'
    ),
    'authenticated role can reach the RPC role check'
  );

set
  local role authenticated;

set
  local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-00000000ee10","role":"authenticated"}';

select
  extensions.is (
    (
      select
        total_count
      from
        public.list_unregistered_members (
          (
            select
              event_id
            from
              list_unregistered_members_fixture
          ),
          20,
          0,
          'unreg-' || (
            select
              event_id::text
            from
              list_unregistered_members_fixture
          )
        )
    ),
    2::bigint,
    'admin can execute the list RPC'
  );

set
  local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-00000000ee11","role":"authenticated"}';

select
  extensions.is (
    (
      select
        total_count
      from
        public.list_unregistered_members (
          (
            select
              event_id
            from
              list_unregistered_members_fixture
          ),
          20,
          0,
          'unreg-' || (
            select
              event_id::text
            from
              list_unregistered_members_fixture
          )
        )
    ),
    2::bigint,
    'SLOD can execute the list RPC'
  );

set
  local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-00000000ee12","role":"authenticated"}';

select
  extensions.is (
    (
      select
        total_count
      from
        public.list_unregistered_members (
          (
            select
              event_id
            from
              list_unregistered_members_fixture
          ),
          20,
          0,
          'unreg-' || (
            select
              event_id::text
            from
              list_unregistered_members_fixture
          )
        )
    ),
    2::bigint,
    'super-admin can execute the list RPC'
  );

select
  *
from
  extensions.finish ();

rollback;
