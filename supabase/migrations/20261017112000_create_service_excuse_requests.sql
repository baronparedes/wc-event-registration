begin;

-- 1. Create service_excuse_requests table
create table if not exists public.service_excuse_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  member_id text not null,
  request_date date not null,
  services text[] not null default array['All Services']::text[],
  reason text,
  status text not null default 'approved' check (status in ('approved', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes
create index if not exists idx_service_excuse_requests_user_date on public.service_excuse_requests (user_id, request_date);

create index if not exists idx_service_excuse_requests_date on public.service_excuse_requests (request_date);

create index if not exists idx_service_excuse_requests_status on public.service_excuse_requests (status);

-- 3. Enable RLS
alter table public.service_excuse_requests enable row level security;

-- 4. RLS Policies
drop policy if exists "users and admins can view excuse requests" on public.service_excuse_requests;

create policy "users and admins can view excuse requests" on public.service_excuse_requests for
select
  to authenticated using (
    public.is_admin_viewer ()
    or user_id = auth.uid ()
    or exists (
      select
        1
      from
        public.users u
      where
        u.id = service_excuse_requests.user_id
        and u.email is not null
        and lower(u.email) = lower(auth.jwt () ->> 'email')
    )
  );

drop policy if exists "users and admins can insert excuse requests" on public.service_excuse_requests;

create policy "users and admins can insert excuse requests" on public.service_excuse_requests for insert to authenticated
with
  check (
    public.is_admin_viewer ()
    or user_id = auth.uid ()
    or exists (
      select
        1
      from
        public.users u
      where
        u.id = service_excuse_requests.user_id
        and u.email is not null
        and lower(u.email) = lower(auth.jwt () ->> 'email')
    )
  );

drop policy if exists "users and admins can update excuse requests" on public.service_excuse_requests;

create policy "users and admins can update excuse requests" on public.service_excuse_requests
for update
  to authenticated using (
    public.is_admin_viewer ()
    or user_id = auth.uid ()
    or exists (
      select
        1
      from
        public.users u
      where
        u.id = service_excuse_requests.user_id
        and u.email is not null
        and lower(u.email) = lower(auth.jwt () ->> 'email')
    )
  )
with
  check (
    public.is_admin_viewer ()
    or user_id = auth.uid ()
    or exists (
      select
        1
      from
        public.users u
      where
        u.id = service_excuse_requests.user_id
        and u.email is not null
        and lower(u.email) = lower(auth.jwt () ->> 'email')
    )
  );

drop policy if exists "admins can delete excuse requests" on public.service_excuse_requests;

create policy "admins can delete excuse requests" on public.service_excuse_requests for delete to authenticated using (public.is_admin_viewer ());

drop policy if exists "service_role has full access to service_excuse_requests" on public.service_excuse_requests;

create policy "service_role has full access to service_excuse_requests" on public.service_excuse_requests for all to service_role using (true)
with
  check (true);

-- 5. Privileges
grant
select
,
  insert,
update,
delete on public.service_excuse_requests to authenticated;

grant all on public.service_excuse_requests to service_role;

commit;
