begin;

-- Returns the number of non-cancelled public registrations for a given event.
create or replace function public.get_public_event_registration_count
(p_event_id uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::bigint
  from public.public_registrations
  where event_id = p_event_id
    and status != 'cancelled'
$$;

grant execute on function public.get_public_event_registration_count(uuid) to anon, authenticated;

-- Returns the combined count of member registrations + public registrations for a given event.
create or replace function public.get_total_event_registration_count
(p_event_id uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select (
    (select count(*)::bigint from public.registrations where event_id = p_event_id and status != 'cancelled') +
    (select count(*)::bigint from public.public_registrations where event_id = p_event_id and status != 'cancelled')
  )
$$;

grant execute on function public.get_total_event_registration_count(uuid) to anon, authenticated;

commit;
