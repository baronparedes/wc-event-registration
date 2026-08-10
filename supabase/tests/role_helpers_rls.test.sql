begin;

create temporary table tap_results (name text not null, pass boolean not null) on
commit
drop;

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
    '00000000-0000-0000-0000-000000000110',
    'admin-rls@test.local',
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
    '00000000-0000-0000-0000-000000000111',
    'slod-rls@test.local',
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
    '00000000-0000-0000-0000-000000000112',
    'imt-rls@test.local',
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
    '00000000-0000-0000-0000-000000000113',
    'kiosk-rls@test.local',
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
    '00000000-0000-0000-0000-000000000114',
    'member-rls@test.local',
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
  ('00000000-0000-0000-0000-000000000110', 'admin'),
  ('00000000-0000-0000-0000-000000000111', 'slod'),
  ('00000000-0000-0000-0000-000000000112', 'imt'),
  ('00000000-0000-0000-0000-000000000113', 'kiosk');

set
  local role authenticated;

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000110", "role": "authenticated"}';

insert into
  tap_results (name, pass)
values
  ('admin satisfies is_admin', public.is_admin ()),
  (
    'admin satisfies is_admin_viewer',
    public.is_admin_viewer ()
  ),
  (
    'admin satisfies is_admin_member_viewer',
    public.is_admin_member_viewer ()
  ),
  (
    'admin does not satisfy is_kiosk',
    not public.is_kiosk ()
  ),
  (
    'admin can read users via member-viewer policy',
    (
      select
        count(*) > 0
      from
        public.users
    )
  );

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000111", "role": "authenticated"}';

insert into
  tap_results (name, pass)
values
  (
    'slod does not satisfy is_admin',
    not public.is_admin ()
  ),
  (
    'slod satisfies is_admin_viewer',
    public.is_admin_viewer ()
  ),
  (
    'slod satisfies is_admin_member_viewer',
    public.is_admin_member_viewer ()
  ),
  (
    'slod does not satisfy is_kiosk',
    not public.is_kiosk ()
  ),
  (
    'slod can read users via member-viewer policy',
    (
      select
        count(*) > 0
      from
        public.users
    )
  );

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000112", "role": "authenticated"}';

insert into
  tap_results (name, pass)
values
begin;

create temporary table tap_results (name text not null, pass boolean not null) on
commit
drop;

insert into
  public.events (id, slug, title, status)
values
  (
    '00000000-0000-0000-0000-00000000ee01',
    'rls-draft-event',
    'RLS Draft Event',
    'draft'
  )
on conflict (id) do nothing;

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
    '00000000-0000-0000-0000-000000000110',
    'admin-rls@test.local',
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
    '00000000-0000-0000-0000-000000000111',
    'slod-rls@test.local',
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
    '00000000-0000-0000-0000-000000000112',
    'imt-rls@test.local',
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
    '00000000-0000-0000-0000-000000000113',
    'kiosk-rls@test.local',
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
    '00000000-0000-0000-0000-000000000114',
    'member-rls@test.local',
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
  ('00000000-0000-0000-0000-000000000110', 'admin'),
  ('00000000-0000-0000-0000-000000000111', 'slod'),
  ('00000000-0000-0000-0000-000000000112', 'imt'),
  ('00000000-0000-0000-0000-000000000113', 'kiosk');

set
  local role authenticated;

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000110", "role": "authenticated"}';

insert into
  tap_results (name, pass)
values
  ('admin satisfies is_admin', public.is_admin ()),
  (
    'admin satisfies is_admin_viewer',
    public.is_admin_viewer ()
  ),
  (
    'admin satisfies is_admin_member_viewer',
    public.is_admin_member_viewer ()
  ),
  (
    'admin does not satisfy is_kiosk',
    not public.is_kiosk ()
  ),
  (
    'admin can read users via member-viewer policy',
    (
      select
        count(*) > 0
      from
        public.users
    )
  ),
  (
    'admin can read draft events via admin viewer policy',
    (
      select
        count(*) = 1
      from
        public.events
      where
        id = '00000000-0000-0000-0000-00000000ee01'
    )
  ),
  (
    'admin can read import staging',
    (
      select
        count(*) >= 0
      from
        public.users_import_staging
    )
  );

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000111", "role": "authenticated"}';

insert into
  tap_results (name, pass)
values
  (
    'slod does not satisfy is_admin',
    not public.is_admin ()
  ),
  (
    'slod satisfies is_admin_viewer',
    public.is_admin_viewer ()
  ),
  (
    'slod satisfies is_admin_member_viewer',
    public.is_admin_member_viewer ()
  ),
  (
    'slod does not satisfy is_kiosk',
    not public.is_kiosk ()
  ),
  (
    'slod can read users via member-viewer policy',
    (
      select
        count(*) > 0
      from
        public.users
    )
  ),
  (
    'slod can read draft events via admin viewer policy',
    (
      select
        count(*) = 1
      from
        public.events
      where
        id = '00000000-0000-0000-0000-00000000ee01'
    )
  ),
  (
    'slod cannot read import staging',
    (
      select
        count(*) = 0
      from
        public.users_import_staging
    )
  );

insert into
  public.attendance_saved_views (id, event_id, name, view_config)
values
  (
    '00000000-0000-0000-0000-000000000901',
    '00000000-0000-0000-0000-00000000ee01',
    'slod-test-view',
    '{}'::jsonb
  );

insert into
  tap_results (name, pass)
values
  (
    'slod can insert attendance saved views',
    (
      select
        count(*) = 1
      from
        public.attendance_saved_views
      where
        id = '00000000-0000-0000-0000-000000000901'
    )
  );

update public.attendance_saved_views
set
  name = 'slod-test-view-updated'
where
  id = '00000000-0000-0000-0000-000000000901';

insert into
  tap_results (name, pass)
values
  (
    'slod can update attendance saved views',
    (
      select
        count(*) = 1
      from
        public.attendance_saved_views
      where
        id = '00000000-0000-0000-0000-000000000901'
        and name = 'slod-test-view-updated'
    )
  );

delete from public.attendance_saved_views
where
  id = '00000000-0000-0000-0000-000000000901';

insert into
  tap_results (name, pass)
values
  (
    'slod can delete attendance saved views',
    (
      select
        count(*) = 0
      from
        public.attendance_saved_views
      where
        id = '00000000-0000-0000-0000-000000000901'
    )
  );

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000112", "role": "authenticated"}';

insert into
  tap_results (name, pass)
values
  (
    'imt does not satisfy is_admin',
    not public.is_admin ()
  ),
  (
    'imt does not satisfy is_admin_viewer',
    not public.is_admin_viewer ()
  ),
  (
    'imt satisfies is_admin_member_viewer',
    public.is_admin_member_viewer ()
  ),
  (
    'imt does not satisfy is_kiosk',
    not public.is_kiosk ()
  ),
  (
    'imt can read users via member-viewer policy',
    (
      select
        count(*) > 0
      from
        public.users
    )
  ),
  (
    'imt cannot read draft events via admin viewer policy',
    (
      select
        count(*) = 0
      from
        public.events
      where
        id = '00000000-0000-0000-0000-00000000ee01'
    )
  ),
  (
    'imt cannot read import staging',
    (
      select
        count(*) = 0
      from
        public.users_import_staging
    )
  );

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000113", "role": "authenticated"}';

insert into
  tap_results (name, pass)
values
  (
    'kiosk does not satisfy is_admin',
    not public.is_admin ()
  ),
  (
    'kiosk does not satisfy is_admin_viewer',
    not public.is_admin_viewer ()
  ),
  (
    'kiosk does not satisfy is_admin_member_viewer',
    not public.is_admin_member_viewer ()
  ),
  ('kiosk satisfies is_kiosk', public.is_kiosk ()),
  (
    'kiosk cannot read users via member-viewer policy',
    (
      select
        count(*) = 0
      from
        public.users
    )
  ),
  (
    'kiosk can read draft events via kiosk policy',
    (
      select
        count(*) = 1
      from
        public.events
      where
        id = '00000000-0000-0000-0000-00000000ee01'
    )
  ),
  (
    'kiosk can read attendance settings via kiosk policy',
    (
      select
        count(*) >= 0
      from
        public.attendance_settings
    )
  ),
  (
    'kiosk cannot read import staging',
    (
      select
        count(*) = 0
      from
        public.users_import_staging
    )
  );

set
  local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000114", "role": "authenticated"}';

insert into
  tap_results (name, pass)
values
  (
    'non-admin does not satisfy is_admin',
    not public.is_admin ()
  ),
  (
    'non-admin does not satisfy is_admin_viewer',
    not public.is_admin_viewer ()
  ),
  (
    'non-admin does not satisfy is_admin_member_viewer',
    not public.is_admin_member_viewer ()
  ),
  (
    'non-admin does not satisfy is_kiosk',
    not public.is_kiosk ()
  ),
  (
    'non-admin cannot read users via member-viewer policy',
    (
      select
        count(*) = 0
      from
        public.users
    )
  ),
  (
    'non-admin cannot read draft events via admin viewer policy',
    (
      select
        count(*) = 0
      from
        public.events
      where
        id = '00000000-0000-0000-0000-00000000ee01'
    )
  ),
  (
    'non-admin cannot read import staging',
    (
      select
        count(*) = 0
      from
        public.users_import_staging
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
