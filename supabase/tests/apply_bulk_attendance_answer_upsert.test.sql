begin;

select
  extensions.plan (2);

do $$
declare
  v_event_id uuid := '00000000-0000-0000-0000-00000000ca01';
  v_other_event_id uuid := '00000000-0000-0000-0000-00000000ca02';
  v_user_id uuid := '00000000-0000-0000-0000-00000000ca03';
  v_registration_id uuid := '00000000-0000-0000-0000-00000000ca04';
  v_field_id uuid := '00000000-0000-0000-0000-00000000ca05';
  v_other_field_id uuid := '00000000-0000-0000-0000-00000000ca06';
  v_failed boolean := false;
begin
  insert into public.events (id, slug, title)
  values
    (v_event_id, 'bulk-attendance-atomic-test', 'Bulk attendance atomic test'),
    (v_other_event_id, 'bulk-attendance-other-event-test', 'Bulk attendance other event')
  on conflict (id) do nothing;

  insert into public.users (id, member_id, full_name)
  values (v_user_id, 'bulk-attendance-atomic-test', 'Attendance Atomic Test Member')
  on conflict (id) do nothing;

  insert into public.registrations (id, event_id, user_id, status, source)
  values (v_registration_id, v_event_id, v_user_id, 'submitted', 'test')
  on conflict (id) do nothing;

  insert into public.attendance_settings (event_id, attendance_enabled)
  values (v_event_id, true)
  on conflict (event_id) do update set attendance_enabled = true;

  insert into public.attendance_fields (id, event_id, field_key, label, field_type)
  values
    (v_field_id, v_event_id, 'answer', 'Answer', 'text'),
    (v_other_field_id, v_other_event_id, 'other_answer', 'Other Answer', 'text')
  on conflict (id) do nothing;

  insert into public.attendance_answers (registration_id, attendance_field_id, answer_text)
  values (v_registration_id, v_field_id, 'Existing answer')
  on conflict (registration_id, attendance_field_id) do update set answer_text = excluded.answer_text;

  begin
    perform public.apply_bulk_attendance_answer_upsert(
      v_event_id,
      jsonb_build_array(
        jsonb_build_object('attendee_kind', 'registered', 'registration_id', v_registration_id)
      ),
      array[v_field_id],
      jsonb_build_array(
        jsonb_build_object(
          'attendee_kind',
          'registered',
          'registration_id',
          v_registration_id,
          'attendance_field_id',
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

  perform extensions.ok(v_failed, 'Attendance answer RPC rejects a field from another event');
  perform extensions.ok(
    (
      select answer_text = 'Existing answer'
      from public.attendance_answers
      where registration_id = v_registration_id
        and attendance_field_id = v_field_id
    ),
    'Attendance answer RPC restores the deleted answer when a later write fails'
  );
end;
$$;

select
  *
from
  extensions.finish ();

rollback;
