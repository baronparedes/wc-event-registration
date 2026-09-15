begin;

create temporary table tap_results (name text not null, pass boolean not null) on
commit
drop;

do $$
declare
  v_fixture_event_id uuid := '00000000-0000-0000-0000-00000000fc02';
  v_guest_field_id uuid := '00000000-0000-0000-0000-00000000fc03';
  v_member_field_id uuid := '00000000-0000-0000-0000-00000000fc04';
  v_event_id uuid;
  v_expected_field_count integer;
  v_context record;
begin
  insert into public.events (id, slug, title, status, allow_public_registrations)
  values (v_fixture_event_id, 'public-registration-context-test', 'Public registration context test', 'published', true)
  on conflict (id) do update
  set status = 'published', allow_public_registrations = true;

  insert into public.event_fields (id, event_id, field_key, label, field_type, applicability, is_active)
  values
    (v_guest_field_id, v_fixture_event_id, 'guest_field', 'Guest field', 'text', 'guests', true),
    (v_member_field_id, v_fixture_event_id, 'member_field', 'Member field', 'text', 'members', true)
  on conflict (id) do update
  set event_id = excluded.event_id, applicability = excluded.applicability, is_active = excluded.is_active;

  select id into v_event_id
  from public.events
  where id = v_fixture_event_id
  limit 1;

  if v_event_id is null then
    insert into tap_results values ('Public registration context fixtures are available', false);
    return;
  end if;

  select count(*)::integer into v_expected_field_count
  from public.event_fields
  where event_id = v_event_id
    and is_active = true
    and applicability in ('guests', 'both');

  select * into v_context
  from public.get_public_registration_submission_context('public-registration-context-test');

  insert into tap_results values
    ('Context RPC returns the published event', v_context.event_id = v_event_id);
  insert into tap_results values
    ('Context RPC returns the event public-registration setting', (
      v_context.allow_public_registrations = (
        select allow_public_registrations from public.events where id = v_event_id
      )
    ));
  insert into tap_results values
    ('Context RPC returns only active guest fields', (
      jsonb_array_length(v_context.fields) = v_expected_field_count
    ));

  delete from public.events where id = v_fixture_event_id;
end
$$;

select
  extensions.plan (
    (
      select
        count(*)::integer
      from
        tap_results
    )
  );

select
  extensions.ok (pass, name)
from
  tap_results
order by
  name;

select
  *
from
  extensions.finish ();

rollback;
