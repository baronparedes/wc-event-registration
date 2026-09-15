begin;

create temporary table tap_results (name text not null, pass boolean not null) on
commit
drop;

do $$
declare
  v_fixture_event_id uuid := '00000000-0000-0000-0000-00000000fd21';
  v_fixture_user_id uuid := '00000000-0000-0000-0000-00000000fd22';
  v_fixture_field_id uuid := '00000000-0000-0000-0000-00000000fd23';
  v_event_id uuid;
  v_user_id uuid;
  v_field_id uuid;
  v_registration_id uuid;
  v_answer_count integer;
begin
  insert into public.events (id, slug, title)
  values (v_fixture_event_id, 'answer-persistence-test', 'Answer persistence test')
  on conflict (id) do nothing;
  insert into public.users (id, member_id, full_name)
  values (v_fixture_user_id, 'answer-persistence-test', 'Answer Persistence Test')
  on conflict (id) do nothing;
  insert into public.event_fields (id, event_id, field_key, label, field_type)
  values (v_fixture_field_id, v_fixture_event_id, 'answer', 'Answer', 'text')
  on conflict (id) do nothing;

  select id into v_event_id from events where id = v_fixture_event_id;
  select id into v_user_id from users where id = v_fixture_user_id;
  select id into v_field_id from event_fields where id = v_fixture_field_id;

  if v_event_id is null or v_user_id is null or v_field_id is null then
    insert into tap_results values ('Answer persistence fixtures are available', false);
    return;
  end if;

  insert into registrations (event_id, user_id, idempotency_key, status)
  values (v_event_id, v_user_id, 'test-answer-persistence-' || md5(random()::text), 'submitted')
  returning id into v_registration_id;

  perform public.persist_registration_answers(
    v_registration_id,
    jsonb_build_array(jsonb_build_object(
      'registration_id', v_registration_id,
      'event_field_id', v_field_id,
      'answer_text', 'first answer'
    )),
    false
  );

  perform public.persist_registration_answers(
    v_registration_id,
    jsonb_build_array(jsonb_build_object(
      'registration_id', v_registration_id,
      'event_field_id', v_field_id,
      'answer_text', 'replacement answer'
    )),
    true
  );

  select count(*) into v_answer_count
  from registration_answers
  where registration_id = v_registration_id
    and answer_text = 'replacement answer';

  insert into tap_results values
    ('Answer persistence RPC replaces existing answers atomically', v_answer_count = 1);
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
