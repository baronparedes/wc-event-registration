begin;

insert into
  public.admin_role_permissions (role, permission)
values
  ('vmt', 'canWriteAdminData'),
  ('vmt', 'canReadAdminData'),
  ('vmt', 'canReadAdminMemberData'),
  ('vmt', 'canReadDashboard')
on conflict (role, permission) do nothing;

commit;
