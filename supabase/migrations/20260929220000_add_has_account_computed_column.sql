begin;

create or replace function public.has_account (member public.users) returns boolean as $$
  select exists (
    select 1
    from auth.users
    where lower(email::text) = lower(member.email)
  );
$$ language sql stable security definer
set
  search_path = public;

revoke
execute on function public.has_account (public.users)
from
  public,
  anon;

grant
execute on function public.has_account (public.users) to authenticated,
service_role;

commit;
