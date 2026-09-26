begin;

create table if not exists public.service_exception_dates (
  id uuid primary key default gen_random_uuid(),
  exception_date date not null unique,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.service_exception_dates enable row level security;

drop policy if exists "allow authenticated read" on public.service_exception_dates;

create policy "allow authenticated read" on public.service_exception_dates for
select
  to authenticated using (true);

drop policy if exists "allow service_role all" on public.service_exception_dates;

create policy "allow service_role all" on public.service_exception_dates for all to service_role using (true)
with
  check (true);

drop policy if exists "allow admin manage" on public.service_exception_dates;

create policy "allow admin manage" on public.service_exception_dates for all to authenticated using (public.is_admin_viewer ())
with
  check (public.is_admin_viewer ());

grant
select
  on public.service_exception_dates to authenticated;

grant all on public.service_exception_dates to service_role;

commit;
