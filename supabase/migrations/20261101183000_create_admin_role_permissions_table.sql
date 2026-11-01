begin;

create table if not exists public.admin_role_permissions (
  role text not null,
  permission text not null,
  created_at timestamptz not null default now(),
  primary key (role, permission),
  constraint admin_role_permissions_role_check check (
    role in ('super_admin', 'admin', 'slod', 'imt', 'kiosk')
  ),
  constraint admin_role_permissions_permission_check check (
    permission in (
      'canWriteAdminData',
      'canReadAdminData',
      'canReadAdminMemberData',
      'canManageAttendanceSavedViews',
      'canExportAdminReports',
      'canAccessAttendanceCheckIn',
      'canViewMemberHistory',
      'canManageAdminRoles',
      'canReadDashboard',
      'canManageServices'
    )
  )
);

alter table public.admin_role_permissions enable row level security;

drop policy if exists "admins can read role permissions" on public.admin_role_permissions;

create policy "admins can read role permissions" on public.admin_role_permissions for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.admins a
      where
        a.auth_user_id = auth.uid ()
    )
  );

drop policy if exists "service_role can manage role permissions" on public.admin_role_permissions;

create policy "service_role can manage role permissions" on public.admin_role_permissions for all to service_role using (true)
with
  check (true);

grant
select
  on public.admin_role_permissions to authenticated;

grant all on public.admin_role_permissions to service_role;

insert into
  public.admin_role_permissions (role, permission)
values
  -- super_admin
  ('super_admin', 'canWriteAdminData'),
  ('super_admin', 'canReadAdminData'),
  ('super_admin', 'canReadAdminMemberData'),
  ('super_admin', 'canManageAttendanceSavedViews'),
  ('super_admin', 'canExportAdminReports'),
  ('super_admin', 'canAccessAttendanceCheckIn'),
  ('super_admin', 'canViewMemberHistory'),
  ('super_admin', 'canManageAdminRoles'),
  ('super_admin', 'canReadDashboard'),
  ('super_admin', 'canManageServices'),
  -- admin
  ('admin', 'canWriteAdminData'),
  ('admin', 'canReadAdminData'),
  ('admin', 'canReadAdminMemberData'),
  ('admin', 'canManageAttendanceSavedViews'),
  ('admin', 'canExportAdminReports'),
  ('admin', 'canAccessAttendanceCheckIn'),
  ('admin', 'canViewMemberHistory'),
  ('admin', 'canReadDashboard'),
  ('admin', 'canManageServices'),
  -- slod
  ('slod', 'canReadAdminData'),
  ('slod', 'canReadAdminMemberData'),
  ('slod', 'canManageAttendanceSavedViews'),
  ('slod', 'canExportAdminReports'),
  ('slod', 'canViewMemberHistory'),
  ('slod', 'canReadDashboard'),
  ('slod', 'canManageServices'),
  -- imt
  ('imt', 'canReadAdminMemberData'),
  ('imt', 'canReadDashboard'),
  -- kiosk
  ('kiosk', 'canAccessAttendanceCheckIn')
on conflict (role, permission) do nothing;

commit;
