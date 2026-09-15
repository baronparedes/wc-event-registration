begin;

create temporary table tap_results (name text not null, pass boolean not null) on
commit
drop;

do $$
declare
  v_context record;
  v_event_id uuid;
  v_user_id uuid;
  v_field_count integer;
begin
  select id into v_event_id from events where slug = 'sample-event' limit 1;
  select id into v_user_id from users where member_id = '3865598676' limit 1;

  select *
  into v_context
  from public.get_registration_submission_context('sample-event', '3865598676');

  v_field_count := jsonb_array_length(v_context.fields);

  insert into tap_results values
    ('Context RPC resolves the published event', v_context.event_id = v_event_id);
  insert into tap_results values
    ('Context RPC resolves the member', v_context.user_id = v_user_id);
  insert into tap_results values
    ('Context RPC returns a fields array', v_context.fields is not null);
  insert into tap_results values
    ('Context RPC filters fields to member-applicable active fields', v_field_count = (
      select count(*)
      from event_fields
      where event_id = v_event_id
        and is_active = true
        and applicability in ('members', 'both')
    ));
  insert into tap_results values
    ('Context RPC returns one row for a missing event', (
      select count(*) = 1
      from public.get_registration_submission_context('missing-event', '3865598676')
    ));
  insert into tap_results values
    ('Context RPC marks a missing event with a null event ID', (
      select event_id is null
      from public.get_registration_submission_context('missing-event', '3865598676')
    ));
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
