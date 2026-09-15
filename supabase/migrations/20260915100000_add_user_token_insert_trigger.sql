begin;

create or replace function public.create_user_token_for_user () returns trigger language plpgsql security definer
set
  search_path = public as $$
begin
  insert into public.user_tokens (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger users_create_user_token
after insert on public.users for each row
execute function public.create_user_token_for_user ();

commit;
