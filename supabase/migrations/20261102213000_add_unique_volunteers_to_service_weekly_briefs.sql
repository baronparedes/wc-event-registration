begin;

alter table public.service_weekly_briefs
add column if not exists unique_volunteers integer not null default 0;

commit;
