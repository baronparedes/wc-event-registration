alter table public.users
add column
if not exists is_active boolean;

update public.users
set is_active = true
where is_active is null;

alter table public.users
alter column is_active
set
default true;

alter table public.users
alter column is_active
set
not null;

create index
if not exists users_is_active_idx
on public.users
(is_active);
