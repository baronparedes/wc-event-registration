begin;

    -- Returns the number of non-cancelled registrations for a given event.
    -- Declared SECURITY DEFINER so the anon role can retrieve the count without
    -- needing direct SELECT access to the registrations table.
    create or replace function public.get_event_registration_count
    (p_event_id uuid)
returns bigint
language sql
security definer
stable
    set search_path
    = public
as $$
    select count(*)
    ::bigint
  from public.registrations
  where event_id = p_event_id
    and status != 'cancelled'
$$;

    grant execute on function public.get_event_registration_count
    (uuid) to anon, authenticated;

    commit;
