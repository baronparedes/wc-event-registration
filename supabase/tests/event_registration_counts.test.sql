begin;

create temporary table tap_results (name text not null, pass boolean not null) on
commit
drop;

do $$
declare
  v_event_id uuid;
  v_future_event_id uuid;
  v_user_id uuid;
  v_member_registration_id uuid;
  v_public_registration_id uuid;
  v_member_count bigint;
  v_public_count bigint;
  v_unknown_count integer;
  v_key text := 'test-counts-' || md5(random()::text);
  v_email text := 'test-counts-' || md5(random()::text) || '@example.test';
begin
  select id into v_event_id from events where slug = 'sample-event' limit 1;
  select id into v_future_event_id from events where slug = 'future-event' limit 1;
  select id into v_user_id from users where member_id = '3865598676' limit 1;

  if v_event_id is null or v_future_event_id is null or v_user_id is null then
    insert into tap_results values ('Registration count fixtures are available', false);
    return;
  end if;

  delete from public_registrations where event_id in (v_event_id, v_future_event_id);
  delete from registrations where event_id in (v_event_id, v_future_event_id);

  insert into registrations (event_id, user_id, idempotency_key, status)
  values (v_event_id, v_user_id, v_key, 'submitted'::registration_status)
  returning id into v_member_registration_id;

  insert into public_registrations (event_id, first_name, last_name, email, status)
  values (v_event_id, 'Count', 'Test', v_email, 'submitted'::registration_status)
  returning id into v_public_registration_id;

  insert into registrations (event_id, user_id, idempotency_key, status)
  select v_future_event_id, v_user_id, v_key || '-cancelled', 'cancelled'::registration_status;

  select member_count, public_count
  into v_member_count, v_public_count
  from public.get_event_registration_counts(array[v_event_id, v_future_event_id, v_event_id])
  where event_id = v_event_id;

  select count(*) into v_unknown_count
  from public.get_event_registration_counts(array['00000000-0000-0000-0000-000000000000'::uuid]);

  insert into tap_results values
    ('Array RPC returns member count without cancelled rows', v_member_count = 1);
  insert into tap_results values
    ('Array RPC returns public count without cancelled rows', v_public_count = 1);
  insert into tap_results values
    ('Array RPC deduplicates requested event IDs', (
      select count(*) = 2
      from public.get_event_registration_counts(array[v_event_id, v_future_event_id, v_event_id])
    ));
  insert into tap_results values
    ('Array RPC returns zero counts for an event without registrations', (
      select member_count = 0 and public_count = 0
      from public.get_event_registration_counts(array[v_future_event_id])
      where event_id = v_future_event_id
    ));
  insert into tap_results values ('Array RPC omits unknown event IDs', v_unknown_count = 0);

  delete from public_registrations where id = v_public_registration_id;
  delete from registrations where id = v_member_registration_id
    or idempotency_key = v_key || '-cancelled';
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
