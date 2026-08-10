begin;

alter table public.admins
drop constraint if exists admins_role_allowed;

alter table public.admins
add constraint admins_role_allowed check (
  role in ('admin', 'super_admin', 'slod', 'imt', 'kiosk')
);

commit;
