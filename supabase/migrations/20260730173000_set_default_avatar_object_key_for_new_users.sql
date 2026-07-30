begin;

alter table public.users
alter column avatar_object_key
set default (gen_random_uuid()::text || '.jpg');

commit;
