begin;

    -- Chunk 3: public member lookup RPC for ID-first gate.
    -- Returns only minimal profile fields needed for confirmation.
    create or replace function public.lookup_member_for_registration
    (input_member_id text)
returns table
    (
  user_id uuid,
  full_name text,
  nickname text,
  first_name text,
  last_name text
)
language sql
security definer
stable
    set search_path
    = public
as $$
    select
        u.id,
        u.full_name,
        u.nickname,
        u.first_name,
        u.last_name
    from public.users u
    where u.member_id = nullif(trim(input_member_id), '')
    limit 1;
$$;

revoke all on function public.lookup_member_for_registration
(text) from public;
grant execute on function public.lookup_member_for_registration
(text) to anon, authenticated;

commit;