begin;

alter type public.duplicate_policy
add value if not exists 'allow_multiple';

alter table public.registrations
add column if not exists registration_scope_key text not null default 'primary';

drop index if exists public.registrations_event_user_unique_idx;

create unique index registrations_event_user_unique_idx on public.registrations (event_id, user_id, registration_scope_key);

alter table public.public_registrations
add column if not exists registration_scope_key text not null default 'primary';

drop index if exists public.public_registrations_event_email_unique_idx;

create unique index public_registrations_event_email_unique_idx on public.public_registrations (event_id, lower(email), registration_scope_key);

commit;
