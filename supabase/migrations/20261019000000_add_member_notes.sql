begin;

alter table public.users
add column notes jsonb not null default '[]'::jsonb;

create or replace function public.add_member_note (
  p_user_id uuid,
  p_text text,
  p_author_id uuid,
  p_author_name text
) returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from public.admins where auth_user_id = auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  update public.users
  set notes = notes || jsonb_build_object(
    'id', gen_random_uuid(),
    'text', p_text,
    'author_id', p_author_id,
    'author_name', p_author_name,
    'created_at', now()
  )
  where id = p_user_id;
end;
$$;

create or replace function public.delete_member_note (p_user_id uuid, p_note_id uuid) returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from public.admins where auth_user_id = auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  update public.users
  set notes = (
    select coalesce(jsonb_agg(elem), '[]'::jsonb)
    from jsonb_array_elements(notes) as elem
    where elem->>'id' != p_note_id::text
  )
  where id = p_user_id;
end;
$$;

commit;
