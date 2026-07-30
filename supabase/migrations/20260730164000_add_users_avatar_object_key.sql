begin;

alter table public.users
add column if not exists avatar_object_key text;

create unique index if not exists users_avatar_object_key_unique_idx on public.users (avatar_object_key)
where
  avatar_object_key is not null;

commit;
