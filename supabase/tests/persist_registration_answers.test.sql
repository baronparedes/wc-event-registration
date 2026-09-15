begin;

create temporary table tap_results (name text not null, pass boolean not null) on
commit
drop;

do $$
declare
  v_event_id uuid;
  v_user_id uuid;
  v_field_id uuid;
  v_registration_id uuid;
  v_answer_count integer;
begin
  select id into v_event_id from events where slug = 'sample-event' limit 1;
  select id into v_user_id from users where member_id = '3865598676' limit 1;
  select id into v_field_id from event_fields where event_id = v_event_id limit 1;

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
