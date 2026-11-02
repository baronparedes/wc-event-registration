begin;

alter table public.admins
drop constraint if exists admins_role_allowed;

alter table public.admins
add constraint admins_role_allowed check (
  role in (
    'admin',
    'super_admin',
    'slod',
    'vmt',
    'imt',
    'kiosk'
  )
);

alter table public.admin_role_permissions
drop constraint if exists admin_role_permissions_role_check;

alter table public.admin_role_permissions
add constraint admin_role_permissions_role_check check (
  role in (
    'super_admin',
    'admin',
    'slod',
    'vmt',
    'imt',
    'kiosk'
  )
);

create or replace function public.is_recruitment_reviewer () returns boolean language sql security definer stable
set
  search_path = public as $$
  select exists (
    select 1
    from public.admins
    where auth_user_id = auth.uid()
      and role in ('super_admin', 'admin', 'slod', 'vmt')
  );
$$;

revoke
execute on function public.is_recruitment_reviewer ()
from
  public,
  anon;

grant
execute on function public.is_recruitment_reviewer () to authenticated,
service_role;

commit;
