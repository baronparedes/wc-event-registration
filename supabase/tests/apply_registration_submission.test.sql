begin;

create temporary table tap_results (name text not null, pass boolean not null) on
commit
drop;

do $$
declare
  v_fixture_event_id uuid := '00000000-0000-0000-0000-00000000fd01';
  v_fixture_user_id uuid := '00000000-0000-0000-0000-00000000fd02';
  v_event_id uuid;
  v_user_id uuid;
  v_first record;
  v_replay record;
  v_blocked record;
  v_key text := 'test-apply-registration-' || md5(random()::text);
begin
  insert into public.events (id, slug, title)
  values (v_fixture_event_id, 'member-registration-rpc-test', 'Member registration RPC test')
  on conflict (id) do nothing;
  insert into public.users (id, member_id, full_name)
  values (v_fixture_user_id, 'member-registration-rpc-test', 'Member Registration Test')
  on conflict (id) do nothing;

  select id into v_event_id from events where id = v_fixture_event_id;
  select id into v_user_id from users where id = v_fixture_user_id;

  if v_event_id is null or v_user_id is null then
    insert into tap_results values ('Registration mutation fixtures are available', false);
    return;
  end if;

  delete from registrations where event_id = v_event_id and user_id = v_user_id;

  select * into v_first
  from public.apply_registration_submission(v_event_id, v_user_id, 'primary', v_key, false, 'block');

  select * into v_replay
  from public.apply_registration_submission(v_event_id, v_user_id, 'primary', v_key, false, 'block');

  select * into v_blocked
  from public.apply_registration_submission(v_event_id, v_user_id, 'primary', v_key || '-different', false, 'block');

  insert into tap_results values
    ('Mutation RPC creates a submitted registration', v_first.registration_id is not null and v_first.is_new);
  insert into tap_results values
    ('Mutation RPC replays the same idempotency key', v_replay.registration_id = v_first.registration_id and not v_replay.should_write_answers);
  insert into tap_results values
    ('Mutation RPC blocks a duplicate registration', v_blocked.error_code = 'duplicate_blocked');

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
