begin;

create extension if not exists pgcrypto;

create type public.event_status as enum('draft', 'published', 'archived');

create type public.duplicate_policy as enum('block', 'allow_update');

create type public.registration_mode as enum('open', 'closed');

create type public.registration_status as enum('submitted', 'updated', 'cancelled');

create type public.event_field_type as enum(
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'select',
  'radio',
  'checkbox',
  'multi_select',
  'date',
  'datetime',
  'boolean'
);

create or replace function public.set_updated_at () returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  first_name text,
  last_name text,
  full_name text not null,
  nickname text,
  email text,
  phone text,
  date_of_birth date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_member_id_not_blank check (length(trim(member_id)) > 0),
  constraint users_full_name_not_blank check (length(trim(full_name)) > 0)
);

create unique index users_member_id_unique_idx on public.users (member_id);

create unique index users_email_unique_ci_idx on public.users ((lower(email)))
where
  email is not null;

create trigger users_set_updated_at
before update on public.users for each row
execute function public.set_updated_at ();

create table public.admins (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  constraint admins_role_allowed check (role in ('admin', 'super_admin'))
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  status public.event_status not null default 'draft',
  duplicate_policy public.duplicate_policy not null default 'block',
  require_id_lookup boolean not null default true,
  registration_mode public.registration_mode not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_by_admin_id uuid references public.admins (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_slug_not_blank check (length(trim(slug)) > 0),
  constraint events_title_not_blank check (length(trim(title)) > 0),
  constraint events_end_after_start check (
    starts_at is null
    or ends_at is null
    or ends_at > starts_at
  ),
  constraint events_reg_close_after_open check (
    registration_opens_at is null
    or registration_closes_at is null
    or registration_closes_at > registration_opens_at
  ),
  constraint events_require_id_lookup_locked_true check (require_id_lookup = true)
);

create unique index events_slug_unique_idx on public.events (slug);

create index events_status_idx on public.events (status);

create index events_registration_window_idx on public.events (registration_opens_at, registration_closes_at);

create trigger events_set_updated_at
before update on public.events for each row
execute function public.set_updated_at ();

create table public.event_fields (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type public.event_field_type not null,
  is_required boolean not null default false,
  is_active boolean not null default true,
  placeholder text,
  help_text text,
  options jsonb not null default '[]'::jsonb,
  validation_rules jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_fields_key_not_blank check (length(trim(field_key)) > 0),
  constraint event_fields_label_not_blank check (length(trim(label)) > 0),
  constraint event_fields_display_order_non_negative check (display_order >= 0)
);

create unique index event_fields_event_key_unique_idx on public.event_fields (event_id, field_key);

create index event_fields_event_display_idx on public.event_fields (event_id, display_order);

create index event_fields_event_active_idx on public.event_fields (event_id, is_active);

create trigger event_fields_set_updated_at
before update on public.event_fields for each row
execute function public.set_updated_at ();

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete restrict,
  status public.registration_status not null default 'submitted',
  idempotency_key text,
  source text not null default 'public',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registrations_source_not_blank check (length(trim(source)) > 0)
);

create unique index registrations_event_user_unique_idx on public.registrations (event_id, user_id);

create unique index registrations_event_idempotency_unique_idx on public.registrations (event_id, idempotency_key)
where
  idempotency_key is not null;

create index registrations_event_status_idx on public.registrations (event_id, status);

create index registrations_user_idx on public.registrations (user_id);

create trigger registrations_set_updated_at
before update on public.registrations for each row
execute function public.set_updated_at ();

create table public.registration_answers (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  event_field_id uuid not null references public.event_fields (id) on delete cascade,
  answer_text text,
  answer_number numeric,
  answer_boolean boolean,
  answer_date date,
  answer_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registration_answers_value_present check (
    answer_text is not null
    or answer_number is not null
    or answer_boolean is not null
    or answer_date is not null
    or answer_json is not null
  )
);

create unique index registration_answers_registration_field_unique_idx on public.registration_answers (registration_id, event_field_id);

create index registration_answers_field_idx on public.registration_answers (event_field_id);

create trigger registration_answers_set_updated_at
before update on public.registration_answers for each row
execute function public.set_updated_at ();

commit;
