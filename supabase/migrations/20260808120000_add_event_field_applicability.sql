begin;

alter table public.event_fields
add column applicability text not null default 'both';

alter table public.event_fields
add constraint event_fields_applicability_valid check (applicability in ('members', 'guests', 'both'));

create index event_fields_event_active_applicability_idx on public.event_fields (event_id, is_active, applicability);

commit;
