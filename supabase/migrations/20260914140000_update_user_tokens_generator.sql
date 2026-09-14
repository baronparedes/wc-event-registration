begin;

create sequence if not exists public.user_token_seq;

create or replace function public.generate_user_token () returns text language sql security definer
set
  search_path = public as $$
  select 'USR_' || lpad(nextval('public.user_token_seq')::text, 6, '0');
$$;

grant
execute on function public.generate_user_token () to service_role,
authenticated;

grant usage,
select
  on sequence public.user_token_seq to service_role,
  authenticated;

alter table public.user_tokens
alter column token
set default public.generate_user_token ();

create or replace function public.tokenize_all_users () returns integer language plpgsql security definer
set
  search_path = public as $$
declare
  v_inserted_count integer := 0;
begin
  if not (public.is_admin () or auth.role() = 'service_role' or current_user = 'service_role') then
    raise exception 'unauthorized';
  end if;

  with inserted as (
    insert into public.user_tokens (user_id, token)
    select u.id, public.generate_user_token()
    from public.users u
    where not exists (
      select 1
      from public.user_tokens ut
      where ut.user_id = u.id
    )
    order by u.created_at asc
    on conflict (user_id) do nothing
    returning 1
  )
  select count(*) into v_inserted_count from inserted;

  return v_inserted_count;
end;
$$;

commit;
