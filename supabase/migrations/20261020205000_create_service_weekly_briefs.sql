begin;

create table if not exists public.service_weekly_briefs (
  id uuid primary key default gen_random_uuid(),
  sunday_date date not null unique,
  turnup_rate numeric(5, 2) not null,
  total_committed integer not null default 0,
  total_present integer not null default 0,
  total_walk_ins integer not null default 0,
  peak_slot text not null,
  summary text not null,
  key_highlights jsonb not null default '[]'::jsonb,
  metrics_snapshot jsonb not null default '{}'::jsonb,
  generated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_weekly_briefs_sunday_date on public.service_weekly_briefs (sunday_date desc);

create index if not exists idx_service_weekly_briefs_created_at on public.service_weekly_briefs (created_at desc);

alter table public.service_weekly_briefs enable row level security;

-- Drop policies before creating to avoid duplicate policy errors
drop policy if exists "allow authenticated admin viewer read" on public.service_weekly_briefs;

drop policy if exists "allow admin manage" on public.service_weekly_briefs;

drop policy if exists "allow service_role all" on public.service_weekly_briefs;

create policy "allow authenticated admin viewer read" on public.service_weekly_briefs for
select
  to authenticated using (public.is_admin_viewer ());

create policy "allow admin manage" on public.service_weekly_briefs for all to authenticated using (public.is_admin_viewer ())
with
  check (public.is_admin_viewer ());

create policy "allow service_role all" on public.service_weekly_briefs for all to service_role using (true)
with
  check (true);

grant
select
,
  insert,
update,
delete on public.service_weekly_briefs to authenticated;

grant all on public.service_weekly_briefs to service_role;

commit;
