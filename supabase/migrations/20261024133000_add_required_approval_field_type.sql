begin;

-- 1. Extend event_field_type enum with 'required_approval'
alter type public.event_field_type
add value if not exists 'required_approval';

-- 2. Extend approval_entity_type enum with 'event_registration' for future-proofing
alter type public.approval_entity_type
add value if not exists 'event_registration';

-- 3. RPC to list active approver users (super_admin, admin, slod) for dynamic field configuration
create or replace function public.list_approver_users () returns table (
  auth_user_id uuid,
  email text,
  name text,
  role text,
  avatar_object_key text
) language plpgsql security definer stable
set
  search_path = public as $$
begin
  if not (
    public.is_admin_viewer()
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'unauthorized';
  end if;

  return query
  select
    a.auth_user_id,
    u.email::text,
    coalesce(
      nullif(m.full_name, ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'display_name', ''),
      split_part(u.email::text, '@', 1)
    ) as name,
    a.role::text as role,
    m.avatar_object_key
  from public.admins a
  join auth.users u on u.id = a.auth_user_id
  left join public.users m on lower(m.email) = lower(u.email::text)
  where a.role in ('admin', 'super_admin', 'slod')
  order by name asc;
end;
$$;

revoke
execute on function public.list_approver_users ()
from
  public,
  anon;

grant
execute on function public.list_approver_users () to authenticated,
service_role;

commit;
