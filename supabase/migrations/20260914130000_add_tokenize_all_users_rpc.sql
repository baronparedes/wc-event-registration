begin;

create or replace function public.tokenize_all_users () returns integer language plpgsql security definer
set
  search_path = public as $$
declare
  v_inserted_count integer := 0;
begin
  if not public.is_admin () then
    raise exception 'unauthorized';
  end if;

  with inserted as (
    insert into public.user_tokens (user_id)
    select u.id
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

grant
execute on function public.tokenize_all_users () to authenticated,
service_role;

commit;
