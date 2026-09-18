begin;

create temporary table tap_results (name text not null, pass boolean not null) on
commit
drop;

-- 1. Create test auth users
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
    '00000000-0000-0000-0000-000000000301',
    'admin-service-rls@test.local',
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
    '00000000-0000-0000-0000-000000000302',
    'member-a-service-rls@test.local',
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
    '00000000-0000-0000-0000-000000000303',
    'member-b-service-rls@test.local',
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
    '00000000-0000-0000-0000-000000000304',
    'member-c-service-rls@test.local',
    'not-used',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  );

-- 2. Create admin role
insert into
  public.admins (auth_user_id, role)
values
  ('00000000-0000-0000-0000-000000000301', 'admin');

-- 3. Create public.users
-- Member A & B have public.users.id matching auth.users.id
-- Member C has a DIFFERENT public.users.id than auth.users.id to verify session email matching
insert into
  public.users (id, member_id, full_name, email)
values
  (
    '00000000-0000-0000-0000-000000000302',
    'M-302',
    'Member A',
    'member-a-service-rls@test.local'
  ),
  (
    '00000000-0000-0000-0000-000000000303',
    'M-303',
    'Member B',
    'member-b-service-rls@test.local'
  ),
  (
    '00000000-0000-0000-0000-000000000305',
    'M-305',
    'Member C',
    'member-c-service-rls@test.local'
  );

-- 4. Create active and inactive service layouts
insert into
  public.service_layouts (id, description, is_active)
values
  (
    '00000000-0000-0000-0000-000000000310',
    'Active Service Layout',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000311',
    'Inactive Service Layout',
    false
  );

-- 5. Create service seats for each layout
insert into
  public.service_seats (id, layout_id, table_number, seat_number)
values
  (
    '00000000-0000-0000-0000-000000000320',
    '00000000-0000-0000-0000-000000000310',
    'Table 1',
    '1'
  ),
  (
    '00000000-0000-0000-0000-000000000321',
    '00000000-0000-0000-0000-000000000311',
    'Table 2',
    '1'
  );

-- 6. Create attendance records
insert into
  public.service_attendance (
    id,
    user_id,
    service_date,
    time_slot,
    service_seat_id
  )
values
  (
    '00000000-0000-0000-0000-000000000330',
    '00000000-0000-0000-0000-000000000302',
    '2026-09-06',
    '9AM',
    '00000000-0000-0000-0000-000000000320'
  ),
  (
    '00000000-0000-0000-0000-000000000331',
    '00000000-0000-0000-0000-000000000303',
    '2026-09-06',
    '9AM',
    '00000000-0000-0000-0000-000000000320'
  ),
  (
    '00000000-0000-0000-0000-000000000332',
    '00000000-0000-0000-0000-000000000305',
    '2026-09-06',
    '9AM',
    '00000000-0000-0000-0000-000000000320'
  );

-- 7. Test Member A access (direct auth.uid matching)
set
  local role authenticated;

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000302", "email": "member-a-service-rls@test.local", "role": "authenticated"}';

insert into
  tap_results (name, pass)
values
  (
    'member A can read own attendance',
    (
      select
        count(*) = 1
      from
        public.service_attendance
      where
        id = '00000000-0000-0000-0000-000000000330'
    )
  ),
  (
    'member A cannot read member B attendance',
    (
      select
        count(*) = 0
      from
        public.service_attendance
      where
        id = '00000000-0000-0000-0000-000000000331'
    )
  ),
  (
    'member A sees only their own attendance total',
    (
      select
        count(*) = 1
      from
        public.service_attendance
    )
  ),
  (
    'member A can read active service layout',
    (
      select
        count(*) = 1
      from
        public.service_layouts
      where
        id = '00000000-0000-0000-0000-000000000310'
    )
  ),
  (
    'member A cannot read inactive service layout',
    (
      select
        count(*) = 0
      from
        public.service_layouts
      where
        id = '00000000-0000-0000-0000-000000000311'
    )
  ),
  (
    'member A can read seats belonging to active layout',
    (
      select
        count(*) = 1
      from
        public.service_seats
      where
        id = '00000000-0000-0000-0000-000000000320'
    )
  ),
  (
    'member A cannot read seats belonging to inactive layout',
    (
      select
        count(*) = 0
      from
        public.service_seats
      where
        id = '00000000-0000-0000-0000-000000000321'
    )
  );

-- 8. Test Member C access (session email matching when public.users.id != auth.users.id)
set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000304", "email": "member-c-service-rls@test.local", "role": "authenticated"}';

insert into
  tap_results (name, pass)
values
  (
    'member C can read own attendance via session email matching',
    (
      select
        count(*) = 1
      from
        public.service_attendance
      where
        id = '00000000-0000-0000-0000-000000000332'
    )
  ),
  (
    'member C cannot read member A or B attendance',
    (
      select
        count(*) = 0
      from
        public.service_attendance
      where
        id in (
          '00000000-0000-0000-0000-000000000330',
          '00000000-0000-0000-0000-000000000331'
        )
    )
  ),
  (
    'member C sees only their own attendance total',
    (
      select
        count(*) = 1
      from
        public.service_attendance
    )
  );

-- 9. Test Admin access (can read all attendance, layouts, and seats)
set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000301", "role": "authenticated"}';

insert into
  tap_results (name, pass)
values
  (
    'admin can read all attendance records',
    (
      select
        count(*) = 3
      from
        public.service_attendance
      where
        id in (
          '00000000-0000-0000-0000-000000000330',
          '00000000-0000-0000-0000-000000000331',
          '00000000-0000-0000-0000-000000000332'
        )
    )
  ),
  (
    'admin can read both active and inactive layouts',
    (
      select
        count(*) = 2
      from
        public.service_layouts
      where
        id in (
          '00000000-0000-0000-0000-000000000310',
          '00000000-0000-0000-0000-000000000311'
        )
    )
  ),
  (
    'admin can read seats from both active and inactive layouts',
    (
      select
        count(*) = 2
      from
        public.service_seats
      where
        id in (
          '00000000-0000-0000-0000-000000000320',
          '00000000-0000-0000-0000-000000000321'
        )
    )
  );

reset role;

select
  extensions.plan (
    (
      select
        count(*)::integer
      from
        tap_results
    )
  );

select
  extensions.ok (pass, name)
from
  tap_results
order by
  name;

select
  *
from
  extensions.finish ();

rollback;
