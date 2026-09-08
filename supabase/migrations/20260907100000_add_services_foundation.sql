begin;

create table public.service_layouts (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint service_layouts_description_not_blank check (length(trim(description)) > 0)
);

create trigger service_layouts_set_updated_at
before update on public.service_layouts for each row
execute function public.set_updated_at ();

create table public.service_seats (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references public.service_layouts (id) on delete cascade,
  table_number text not null,
  area text,
  seat_number text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint service_seats_table_number_not_blank check (length(trim(table_number)) > 0)
);

create index service_seats_layout_id_idx on public.service_seats (layout_id);

create trigger service_seats_set_updated_at
before update on public.service_seats for each row
execute function public.set_updated_at ();

create table public.service_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete restrict,
  rfid text,
  service_date date not null,
  time_slot text not null,
  checked_in_at timestamptz not null default now(),
  is_walk_in boolean not null default false,
  is_override boolean not null default false,
  is_manual_entry boolean not null default false,
  service_seat_id uuid references public.service_seats (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint service_attendance_time_slot_not_blank check (length(trim(time_slot)) > 0)
);

create index service_attendance_user_id_idx on public.service_attendance (user_id);

create index service_attendance_service_date_idx on public.service_attendance (service_date);

create index service_attendance_rfid_idx on public.service_attendance (rfid)
where
  rfid is not null;

create index service_attendance_service_seat_id_idx on public.service_attendance (service_seat_id)
where
  service_seat_id is not null;

create trigger service_attendance_set_updated_at
before update on public.service_attendance for each row
execute function public.set_updated_at ();

alter table public.service_layouts enable row level security;

alter table public.service_seats enable row level security;

alter table public.service_attendance enable row level security;

create policy "admin viewers can read service_layouts" on public.service_layouts for
select
  to authenticated using (public.is_admin_viewer ());

create policy "admins can modify service_layouts" on public.service_layouts for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "admin viewers can read service_seats" on public.service_seats for
select
  to authenticated using (public.is_admin_viewer ());

create policy "admins can modify service_seats" on public.service_seats for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "admin viewers can read service_attendance" on public.service_attendance for
select
  to authenticated using (public.is_admin_viewer ());

create policy "admins and kiosk can insert service_attendance" on public.service_attendance for insert to authenticated
with
  check (
    public.is_admin ()
    or public.is_kiosk ()
  );

create policy "admins can modify service_attendance" on public.service_attendance
for update
  to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "admins can delete service_attendance" on public.service_attendance for delete to authenticated using (public.is_admin ());

grant
select
,
  insert,
update,
delete on public.service_layouts to authenticated,
service_role;

grant
select
,
  insert,
update,
delete on public.service_seats to authenticated,
service_role;

grant
select
,
  insert,
update,
delete on public.service_attendance to authenticated,
service_role;

commit;
