begin;

create or replace function public.is_super_admin () returns boolean language sql security definer stable
set
  search_path = public as $$
select exists
(
  select 1
  from public.admins
  where auth_user_id = auth.uid()
    and role = 'super_admin'
);
$$;

create or replace function public.list_auth_users (p_search text default null) returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
) language plpgsql security definer stable
set
  search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'unauthorized';
  end if;

  return query
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  where p_search is null
     or trim(p_search) = ''
     or u.email ilike '%' || trim(p_search) || '%'
  order by u.created_at desc;
end;
$$;

grant
execute on function public.list_auth_users (text) to authenticated;

grant
execute on function public.list_auth_users (text) to service_role;

create or replace function public.get_admin_roles () returns table (
  id uuid,
  auth_user_id uuid,
  email text,
  role text,
  created_at timestamptz
) language plpgsql security definer stable
set
  search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'unauthorized';
  end if;

  return query
  select
    a.id,
    a.auth_user_id,
    u.email::text,
    a.role,
    a.created_at
  from public.admins a
  join auth.users u on u.id = a.auth_user_id
  order by a.created_at desc;
end;
$$;

grant
execute on function public.get_admin_roles () to authenticated;

grant
execute on function public.get_admin_roles () to service_role;

drop policy if exists "super_admins can read all admins" on public.admins;

drop policy if exists "super_admins can insert admins" on public.admins;

drop policy if exists "super_admins can update admins" on public.admins;

drop policy if exists "super_admins can delete admins" on public.admins;

create policy "super_admins can read all admins" on public.admins for
select
  to authenticated using (public.is_super_admin ());

create policy "super_admins can insert admins" on public.admins for insert to authenticated
with
  check (
    public.is_super_admin ()
    and role in ('admin', 'slod', 'imt', 'kiosk')
  );

create policy "super_admins can update admins" on public.admins
for update
  to authenticated using (
    public.is_super_admin ()
    and role != 'super_admin'
  )
with
  check (
    public.is_super_admin ()
    and role in ('admin', 'slod', 'imt', 'kiosk')
  );

create policy "super_admins can delete admins" on public.admins for delete to authenticated using (
  public.is_super_admin ()
  and role != 'super_admin'
);

commit;
