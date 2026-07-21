begin;

create table public.attendance_saved_views (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  view_config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, name)
);

create trigger attendance_saved_views_set_updated_at
before update on public.attendance_saved_views for each row
execute function public.set_updated_at ();

create index idx_attendance_saved_views_event_id on public.attendance_saved_views (event_id);

commit;
