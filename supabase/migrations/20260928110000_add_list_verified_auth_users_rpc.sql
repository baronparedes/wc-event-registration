begin;

drop function if exists public.list_verified_auth_users (text);

create function public.list_verified_auth_users (p_search text default null) returns table (
  id uuid,
  name text,
  full_name text,
  last_name text,
  email text,
  avatar_object_key text,
  has_member_profile boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
) language plpgsql stable security definer
set
  search_path = public as $$
begin
  if not (
    public.is_admin()
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'unauthorized';
  end if;

  return query
  select
    auth_user.id,
    coalesce(nullif(member.nickname, ''), nullif(member.first_name, ''), member.full_name) as name,
    member.full_name,
    member.last_name,
    auth_user.email::text as email,
    member.avatar_object_key,
    true as has_member_profile,
    auth_user.created_at,
    auth_user.last_sign_in_at
  from auth.users as auth_user
  join public.users as member
    on lower(member.email) = lower(auth_user.email::text)
  where auth_user.email is not null
    and member.email is not null
    and (
      p_search is null
      or trim(p_search) = ''
      or auth_user.email::text ilike '%' || trim(p_search) || '%'
      or member.full_name ilike '%' || trim(p_search) || '%'
      or member.first_name ilike '%' || trim(p_search) || '%'
      or member.last_name ilike '%' || trim(p_search) || '%'
      or member.nickname ilike '%' || trim(p_search) || '%'
    )
  order by auth_user.created_at desc;
  end;
$$;

revoke
execute on function public.list_verified_auth_users (text)
from
  public,
  anon;

grant
execute on function public.list_verified_auth_users (text) to authenticated,
service_role;

commit;
