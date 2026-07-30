begin;

-- events and event_fields are now served exclusively via Edge Functions (service_role).
-- No client-side code queries these tables as anon; all public reads go through
-- get-public-event, get-public-event-fields, and get-public-event-listing.
drop policy if exists "public can read published events" on public.events;

drop policy if exists "public can read fields of published events" on public.event_fields;

create policy "authenticated can read published events" on public.events for
select
  to authenticated using (status = 'published');

create policy "authenticated can read fields of published events" on public.event_fields for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.events e
      where
        e.id = event_id
        and e.status = 'published'
    )
  );

revoke
select
  on table public.events
from
  anon;

revoke
select
  on table public.event_fields
from
  anon;

revoke
execute on function public.get_total_event_registration_count (uuid)
from
  anon;

revoke
execute on function public.get_public_event_registration_count (uuid)
from
  anon;

commit;
