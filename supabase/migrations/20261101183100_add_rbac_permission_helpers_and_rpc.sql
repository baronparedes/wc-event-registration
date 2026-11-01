begin;

create or replace function public.has_admin_permission (p_permission text) returns boolean language sql security definer stable
set
  search_path = public as $$
  select exists (
    select 1
    from public.admins a
    join public.admin_role_permissions rp on rp.role = a.role
    where a.auth_user_id = auth.uid()
      and rp.permission = p_permission
  );
$$;

revoke
execute on function public.has_admin_permission (text)
from
  public,
  anon,
  authenticated;

grant
execute on function public.has_admin_permission (text) to authenticated,
service_role;

create or replace function public.is_super_admin () returns boolean language sql security definer stable
set
  search_path = public as $$
  select public.has_admin_permission('canManageAdminRoles');
$$;

create or replace function public.is_admin () returns boolean language sql security definer stable
set
  search_path = public as $$
  select public.has_admin_permission('canWriteAdminData');
$$;

create or replace function public.is_admin_viewer () returns boolean language sql security definer stable
set
  search_path = public as $$
  select public.has_admin_permission('canReadAdminData');
$$;

create or replace function public.is_admin_member_viewer () returns boolean language sql security definer stable
set
  search_path = public as $$
  select public.has_admin_permission('canReadAdminMemberData');
$$;

create or replace function public.is_check_in_operator () returns boolean language sql security definer stable
set
  search_path = public as $$
  select public.has_admin_permission('canAccessAttendanceCheckIn');
$$;

create or replace function public.get_my_admin_auth_context () returns table (role text, permissions text[]) language sql security definer stable
set
  search_path = public as $$
  select
    a.role,
    coalesce(
      array_agg(rp.permission order by rp.permission) filter (where rp.permission is not null),
      '{}'::text[]
    ) as permissions
  from public.admins a
  left join public.admin_role_permissions rp on rp.role = a.role
  where a.auth_user_id = auth.uid()
  group by a.role
  limit 1;
$$;

revoke
execute on function public.get_my_admin_auth_context ()
from
  public,
  anon,
  authenticated;

grant
execute on function public.get_my_admin_auth_context () to authenticated,
service_role;

commit;
