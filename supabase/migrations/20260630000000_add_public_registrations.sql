begin;

-- Add allow_public_registrations flag to events table
alter table public.events
add column allow_public_registrations boolean not null default false;

-- Create public_registrations table for non-member event registrants
-- Stores attendee info (first_name, last_name, nickname, email, phone) directly
create table public.public_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  nickname text,
  email text not null,
  phone text,
  status public.registration_status not null default 'submitted',
  idempotency_key text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_registrations_first_name_not_blank check (length(trim(first_name)) > 0),
  constraint public_registrations_last_name_not_blank check (length(trim(last_name)) > 0),
  constraint public_registrations_email_not_blank check (length(trim(email)) > 0)
);

create unique index public_registrations_event_email_unique_idx on public.public_registrations (event_id, lower(email));

create unique index public_registrations_event_idempotency_unique_idx on public.public_registrations (event_id, idempotency_key)
where
  idempotency_key is not null;

create index public_registrations_event_status_idx on public.public_registrations (event_id, status);

create index public_registrations_email_idx on public.public_registrations (lower(email));

create trigger public_registrations_set_updated_at
before update on public.public_registrations for each row
execute function public.set_updated_at ();

-- Create public_registration_answers table for storing field responses from public attendees
create table public.public_registration_answers (
  id uuid primary key default gen_random_uuid(),
  public_registration_id uuid not null references public.public_registrations (id) on delete cascade,
  event_field_id uuid not null references public.event_fields (id) on delete cascade,
  answer_text text,
  answer_number numeric,
  answer_boolean boolean,
  answer_date date,
  answer_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_registration_answers_value_present check (
    answer_text is not null
    or answer_number is not null
    or answer_boolean is not null
    or answer_date is not null
    or answer_json is not null
  )
);

create unique index public_registration_answers_registration_field_unique_idx on public.public_registration_answers (public_registration_id, event_field_id);

create index public_registration_answers_field_idx on public.public_registration_answers (event_field_id);

create trigger public_registration_answers_set_updated_at
before update on public.public_registration_answers for each row
execute function public.set_updated_at ();

commit;
