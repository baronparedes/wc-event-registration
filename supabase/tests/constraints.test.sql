begin;

create temporary table tap_results (name text not null, pass boolean not null) on
commit
drop;

create temporary table tap_fixture as
select
  e.id as event_id,
  e_future.id as future_event_id,
  e_closed.id as closed_event_id,
  u_main.id as user_main_id,
  u_other.id as user_other_id,
  u_future.id as user_future_id
from
  events e
  join events e_future on e_future.slug = 'future-event'
  join events e_closed on e_closed.slug = 'closed-event'
  cross join users u_main
  cross join users u_other
  cross join users u_future
where
  e.slug = 'sample-event'
  and u_main.member_id = '3865598676'
  and u_other.member_id = '1627890198'
  and u_future.member_id = '1628023334'
limit
  1;

insert into
  tap_results (name, pass)
values
  (
    'Fixture records are available for constraints tests',
    (
      select
        count(*) = 1
      from
        tap_fixture
    )
  );

do $$
declare
  v_event_id uuid;
  v_future_event_id uuid;
  v_closed_event_id uuid;
  v_user_main_id uuid;
  v_user_other_id uuid;
  v_user_future_id uuid;
  v_reg_id uuid;
  v_field_id uuid;
  v_duplicate_failed boolean := false;
  v_cascade_deleted boolean := false;
  v_idempotency_failed boolean := false;
  v_enum_failed boolean := false;
  v_submitted_at timestamptz;
  v_updated_at timestamptz;
  v_timestamp_valid boolean := false;
begin
  select
    event_id,
    future_event_id,
    closed_event_id,
    user_main_id,
    user_other_id,
    user_future_id
  into
    v_event_id,
    v_future_event_id,
    v_closed_event_id,
    v_user_main_id,
    v_user_other_id,
    v_user_future_id
  from tap_fixture
  limit 1;

  if v_event_id is null then
    return;
  end if;

  delete from registrations where event_id = v_event_id and user_id = v_user_main_id;
  delete from registrations where event_id = v_event_id and user_id = v_user_other_id;
  delete from registrations where event_id = v_future_event_id and user_id = v_user_future_id;

  -- Test 1: unique (registration_id, event_field_id)
  insert into registrations (event_id, user_id, idempotency_key, status, submitted_at)
  values (v_event_id, v_user_main_id, 'test-unique-' || now()::text, 'submitted'::registration_status, now())
  returning id into v_reg_id;

  select id
  into v_field_id
  from event_fields
  where event_id = v_event_id
  limit 1;

  if v_field_id is not null then
    insert into registration_answers (registration_id, event_field_id, answer_text)
    values (v_reg_id, v_field_id, 'First Answer')
    on conflict do nothing;

    begin
      insert into registration_answers (registration_id, event_field_id, answer_text)
      values (v_reg_id, v_field_id, 'Second Answer');
    exception
      when unique_violation then
        v_duplicate_failed := true;
    end;
  end if;

  insert into tap_results (name, pass)
  values ('Unique constraint blocks duplicate registration_answers', v_duplicate_failed);

  -- Test 2: FK cascade delete
  insert into registrations (event_id, user_id, idempotency_key, status, submitted_at)
  values (
    v_future_event_id,
    v_user_future_id,
    'test-cascade-' || now()::text,
    'submitted'::registration_status,
    now()
  )
  returning id into v_reg_id;

  insert into registration_answers (registration_id, event_field_id, answer_text)
  select v_reg_id, ef.id, 'Cascade Test'
  from event_fields ef
  where ef.event_id = v_future_event_id
  limit 1;

  delete from registrations where id = v_reg_id;

  select count(*) = 0
  into v_cascade_deleted
  from registration_answers
  where registration_id = v_reg_id;

  insert into tap_results (name, pass)
  values ('Deleting registration cascades to registration_answers', v_cascade_deleted);

  -- Test 3: idempotency uniqueness per event
  begin
    insert into registrations (event_id, user_id, idempotency_key, status, submitted_at)
    values (
      v_event_id,
      v_user_other_id,
      'test-idempotency-' || now()::text,
      'submitted'::registration_status,
      now()
    )
    returning id into v_reg_id;

    insert into registrations (event_id, user_id, idempotency_key, status, submitted_at)
    values (
      v_event_id,
      v_user_other_id,
      (select idempotency_key from registrations where id = v_reg_id),
      'submitted'::registration_status,
      now()
    );
  exception
    when unique_violation then
      v_idempotency_failed := true;
  end;

  insert into tap_results (name, pass)
  values ('Idempotency key uniqueness prevents duplicate registration inserts', v_idempotency_failed);

  -- Test 4: enum rejects invalid status
  begin
    insert into registrations (event_id, user_id, idempotency_key, status, submitted_at)
    values (
      v_closed_event_id,
      v_user_main_id,
      'test-enum-' || now()::text,
      'invalid_status'::registration_status,
      now()
    );
  exception
    when invalid_text_representation then
      v_enum_failed := true;
  end;

  insert into tap_results (name, pass)
  values ('registration_status enum rejects invalid values', v_enum_failed);

  -- Test 5: timestamp columns are populated and remain valid after update
  delete from registrations where event_id = v_event_id and user_id = v_user_main_id;

  insert into registrations (event_id, user_id, idempotency_key, status, submitted_at)
  values (
    v_event_id,
    v_user_main_id,
    'test-timestamps-' || now()::text,
    'submitted'::registration_status,
    now()
  )
  returning id, submitted_at, updated_at into v_reg_id, v_submitted_at, v_updated_at;

  update registrations
  set status = 'updated'::registration_status
  where id = v_reg_id;

  select updated_at into v_updated_at from registrations where id = v_reg_id;

  v_timestamp_valid := v_submitted_at is not null and v_updated_at is not null and v_updated_at >= v_submitted_at;

  insert into tap_results (name, pass)
  values ('submitted_at/updated_at timestamps are populated and remain chronologically valid', v_timestamp_valid);

  delete from registrations where idempotency_key like 'test-%';
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
