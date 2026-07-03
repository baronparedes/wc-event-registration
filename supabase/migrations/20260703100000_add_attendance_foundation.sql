begin;

create type public.attendance_field_type as enum (
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'select',
  'radio',
  'checkbox',
  'multi_select',
  'multi_select_toggle',
  'date',
  'datetime',
  'boolean'
);
create type public.attendee_kind as enum ('registered', 'walk_in');

create table public.attendance_settings (
  event_id uuid primary key references public.events(id) on delete cascade,
  attendance_enabled boolean not null default false,
  walk_in_mode_enabled boolean not null default false,
  timeslot_enabled boolean not null default false,
  timeslots text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_settings_dependency_check
    check (attendance_enabled or (not walk_in_mode_enabled and not timeslot_enabled)),
  constraint attendance_settings_timeslots_when_enabled
    check (
      (not timeslot_enabled and cardinality(timeslots) = 0)
      or (timeslot_enabled and cardinality(timeslots) > 0)
    )
);

create trigger attendance_settings_set_updated_at
before update on public.attendance_settings
for each row
execute function public.set_updated_at();

create table public.attendance_fields (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type public.attendance_field_type not null,
  is_required boolean not null default false,
  display_order integer not null default 0,
  options jsonb not null default '[]'::jsonb,
  validation_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_fields_field_key_format
    check (field_key ~ '^[a-z0-9_]+$'),
  constraint attendance_fields_label_not_blank
    check (length(trim(label)) > 0),
  constraint attendance_fields_options_array
    check (jsonb_typeof(options) = 'array'),
  constraint attendance_fields_validation_object
    check (jsonb_typeof(validation_rules) = 'object'),
  constraint attendance_fields_event_field_key_unique
    unique (event_id, field_key)
);

create index attendance_fields_event_order_idx
  on public.attendance_fields (event_id, display_order, created_at);

create trigger attendance_fields_set_updated_at
before update on public.attendance_fields
for each row
execute function public.set_updated_at();

create table public.attendance_answers (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  attendance_field_id uuid not null references public.attendance_fields(id) on delete cascade,
  answer_text text,
  answer_number numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_answers_unique
    unique (registration_id, attendance_field_id),
  constraint attendance_answers_value_present
    check (answer_text is not null or answer_number is not null)
);

create index attendance_answers_registration_idx
  on public.attendance_answers (registration_id);

create index attendance_answers_field_idx
  on public.attendance_answers (attendance_field_id);

create trigger attendance_answers_set_updated_at
before update on public.attendance_answers
for each row
execute function public.set_updated_at();

create table public.attendance_walk_ins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  constraint attendance_walk_ins_full_name_not_blank
    check (length(trim(full_name)) > 0)
);

create index attendance_walk_ins_event_created_at_idx
  on public.attendance_walk_ins (event_id, created_at);

create table public.attendance_check_ins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  attendee_kind public.attendee_kind not null,
  registration_id uuid references public.registrations(id) on delete cascade,
  walk_in_id uuid references public.attendance_walk_ins(id) on delete cascade,
  first_checked_in_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint attendance_check_ins_single_attendee_ref
    check (
      (registration_id is not null and walk_in_id is null)
      or (registration_id is null and walk_in_id is not null)
    )
);

create unique index attendance_check_ins_unique_registered
  on public.attendance_check_ins (event_id, registration_id)
  where registration_id is not null;

create unique index attendance_check_ins_unique_walk_in
  on public.attendance_check_ins (event_id, walk_in_id)
  where walk_in_id is not null;

create index attendance_check_ins_event_first_check_in_idx
  on public.attendance_check_ins (event_id, first_checked_in_at);

create table public.attendance_slot_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  check_in_id uuid not null references public.attendance_check_ins(id) on delete cascade,
  slot text not null,
  recorded_at timestamptz not null default now(),
  constraint attendance_slot_records_slot_not_blank
    check (length(trim(slot)) > 0),
  constraint attendance_slot_records_unique
    unique (check_in_id, slot)
);

create index attendance_slot_records_event_slot_idx
  on public.attendance_slot_records (event_id, slot, recorded_at);

commit;