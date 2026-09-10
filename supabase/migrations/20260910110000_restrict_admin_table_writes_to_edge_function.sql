begin;

-- Admin role writes are performed by the super-admin-protected Edge Function.
revoke all on table public.admins
from
  anon,
  authenticated;

-- Login and role checks read only the current user's row through RLS.
grant
select
  on table public.admins to authenticated;

commit;
