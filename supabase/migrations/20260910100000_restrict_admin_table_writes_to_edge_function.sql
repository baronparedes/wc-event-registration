begin;

-- Admin role writes are performed by the super-admin-protected Edge Function.
revoke all on table public.admins
from
  anon,
  authenticated;

commit;
