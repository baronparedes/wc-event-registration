begin;

-- Speeds up active-registration count functions by indexing only non-cancelled rows.
create index registrations_event_active_count_idx on public.registrations (event_id)
where
  status <> 'cancelled';

create index public_registrations_event_active_count_idx on public.public_registrations (event_id)
where
  status <> 'cancelled';

commit;
