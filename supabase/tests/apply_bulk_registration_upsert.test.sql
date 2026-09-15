begin;

create temporary table tap_results (name text not null, pass boolean not null) on
commit
drop;

do $$
declare
  v_event_id uuid := '00000000-0000-0000-0000-00000000ba01';
  v_other_event_id uuid := '00000000-0000-0000-0000-00000000ba02';
  v_user_id uuid := '00000000-0000-0000-0000-00000000ba03';
  v_field_id uuid := '00000000-0000-0000-0000-00000000ba04';
  v_other_field_id uuid := '00000000-0000-0000-0000-00000000ba05';
  v_failed boolean := false;
begin
    insert into public.events
        (id, slug, title)
    values
        (v_event_id, 'bulk-registration-atomic-test', 'Bulk registration atomic test'),
        (v_other_event_id, 'bulk-registration-other-event-test', 'Bulk registration other event')
    on conflict
    (id) do nothing;

    insert into public.users
        (id, member_id, full_name)
    values
        (v_user_id, 'bulk-registration-atomic-test', 'Atomic Test Member')
    on conflict
    (id) do nothing;

    insert into public.event_fields
        (id, event_id, field_key, label, field_type)
    values
        (v_field_id, v_event_id, 'answer', 'Answer', 'text'),
        (v_other_field_id, v_other_event_id, 'other_answer', 'Other Answer', 'text')
    on conflict
    (id) do nothing;

    begin
    perform public.apply_bulk_registration_upsert
    (
      v_event_id,
      jsonb_build_array
    (jsonb_build_object
    ('row_index', 0, 'user_id', v_user_id)),
      array[v_field_id],
      jsonb_build_array
    (
        jsonb_build_object
    (
          'row_index',
          0,
          'event_field_id',
          v_other_field_id,
          'answer_text',
          'must roll back'
        )
      )
    );
exception
    when others then
      v_failed := true;
end;

  insert into tap_results values
    ('Bulk registration RPC rejects answers from another event', v_failed);
  insert into tap_results values
    (
      'Bulk registration RPC rolls back registration when answer insertion validation fails',
      not exists (
        select 1
        from public.registrations
        where event_id = v_event_id
          and user_id = v_user_id
      )
    );
end;
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
