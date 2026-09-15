begin;

create temporary table tap_results (name text not null, pass boolean not null) on
commit
drop;

do $$
declare
  v_fixture_event_id uuid := '00000000-0000-0000-0000-00000000fc01';
  v_event_id uuid;
  v_first record;
  v_replay record;
  v_blocked record;
  v_email text := 'test-public-registration-' || md5(random()::text) || '@example.test';
  v_key text := 'test-public-registration-' || md5(random()::text);
begin
  insert into public.events (id, slug, title, status, allow_public_registrations)
  values (v_fixture_event_id, 'public-registration-rpc-test', 'Public registration RPC test', 'published', true)
  on conflict (id) do update
  set status = 'published', allow_public_registrations = true;

  select id into v_event_id
  from public.events
  where id = v_fixture_event_id
  limit 1;

  if v_event_id is null then
    insert into tap_results values ('Public registration fixtures are available', false);
    return;
  end if;

  select * into v_first
  from public.apply_public_registration_submission(
    v_event_id,
    'primary',
    v_key,
    false,
    'block',
    'Test',
    'Public',
    null,
    v_email,
    null
  );

  select * into v_replay
  from public.apply_public_registration_submission(
    v_event_id,
    'primary',
    v_key,
    false,
    'block',
    'Test',
    'Public',
    null,
    v_email,
    null
  );

  select * into v_blocked
  from public.apply_public_registration_submission(
    v_event_id,
    'primary',
    v_key || '-different',
    false,
    'block',
    'Test',
    'Public',
    null,
    v_email,
    null
  );

  insert into tap_results values
    ('Mutation RPC creates a submitted public registration', v_first.registration_id is not null and v_first.is_new);
  insert into tap_results values
    ('Mutation RPC replays the same idempotency key', v_replay.registration_id = v_first.registration_id and not v_replay.should_write_answers);
  insert into tap_results values
    ('Mutation RPC blocks a duplicate public registration', v_blocked.error_code = 'duplicate_blocked');

  delete from public.public_registrations where id = v_first.registration_id;
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
