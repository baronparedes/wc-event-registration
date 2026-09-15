begin;

-- Returns non-cancelled member and public registration counts for each event.
-- The requested event IDs are supplied as an array so callers avoid one RPC
-- round trip per event.
create or replace function public.get_event_registration_counts (p_event_ids uuid[]) returns table (
  event_id uuid,
  member_count bigint,
  public_count bigint
) language sql security definer stable
set
  search_path = public as $$
  with requested_events as (
    select distinct requested_event_id as event_id
    from unnest(coalesce(p_event_ids, '{}'::uuid[])) as requested_event_id
  ),
  member_counts as (
    select r.event_id, count(*)::bigint as member_count
    from public.registrations r
    join requested_events requested on requested.event_id = r.event_id
    where r.status != 'cancelled'
    group by r.event_id
  ),
  public_counts as (
    select pr.event_id, count(*)::bigint as public_count
    from public.public_registrations pr
    join requested_events requested on requested.event_id = pr.event_id
    where pr.status != 'cancelled'
    group by pr.event_id
  )
  select
    requested.event_id,
    coalesce(member.member_count, 0)::bigint,
    coalesce(public_registration.public_count, 0)::bigint
  from requested_events requested
  left join member_counts member on member.event_id = requested.event_id
  left join public_counts public_registration on public_registration.event_id = requested.event_id
$$;

grant
execute on function public.get_event_registration_counts (uuid[]) to anon,
authenticated;

commit;
