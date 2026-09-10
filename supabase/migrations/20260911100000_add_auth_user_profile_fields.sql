begin;

drop function if exists public.list_auth_users (text);

create or replace function public.list_auth_users (p_search text default null) returns table (
  id uuid,
  name text,
  email text,
  avatar_object_key text,
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
    coalesce(
      nullif(u.raw_user_meta_data ->> 'name', ''),
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'display_name', ''),
      split_part(u.email::text, '@', 1)
    ) as name,
    u.email::text,
    member.avatar_object_key,
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  left join public.users member on lower(member.email) = lower(u.email::text)
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

drop function if exists public.get_admin_roles ();

create or replace function public.get_admin_roles () returns table (
  id uuid,
  auth_user_id uuid,
  name text,
  avatar_object_key text,
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
    coalesce(
      nullif(u.raw_user_meta_data ->> 'name', ''),
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'display_name', ''),
      split_part(u.email::text, '@', 1)
    ) as name,
    member.avatar_object_key,
    u.email::text,
    a.role,
    a.created_at
  from public.admins a
  join auth.users u on u.id = a.auth_user_id
  left join public.users member on lower(member.email) = lower(u.email::text)
  order by a.created_at desc;
end;
$$;

grant
execute on function public.get_admin_roles () to authenticated;

grant
execute on function public.get_admin_roles () to service_role;

commit;
