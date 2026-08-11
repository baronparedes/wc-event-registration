begin;

create or replace function public.get_member_event_history (p_user_id uuid) returns jsonb language plpgsql security definer stable
set
  search_path = public as $$
    begin
        if not public.is_admin_or_slod () then
    raise exception 'unauthorized';
end
if;

  return (
with
    history
    as
    (
        select
            jsonb_build_object(
            'event_id', e.id,
            'event_title', e.title,
            'event_slug', e.slug,
            'starts_at', e.starts_at,
            'ends_at', e.ends_at,
            'location', e.location,
            'registration_id', r.id,
            'registration_status', r.status,
            'check_in_status',
              case
                when check_in.first_checked_in_at is null then 'not_checked_in'
                else 'checked_in'
              end,
            'official_check_in_time', check_in.first_checked_in_at,
            'attendance_enabled', coalesce(att_settings.attendance_enabled, false),
            'registration_answers', coalesce(registration_answers.answers, '[]'
    ::jsonb),
            'attendance_answers', coalesce
(attendance_answers.answers, '[]'::jsonb),
            'slot_records', coalesce
(slot_records.records, '[]'::jsonb)
          ) as item,
          e.starts_at as sort_key
        from public.registrations r
        join public.events e on e.id = r.event_id
        left join lateral
(
          select s.attendance_enabled
from public.attendance_settings s
where s.event_id = e.id
limit 1
        ) as att_settings on true
        left join lateral
(
          select ci.first_checked_in_at, ci.id as check_in_id
from public.attendance_check_ins ci
where ci.event_id = e.id
    and ci.registration_id = r.id
order by ci.first_checked_in_at asc
          limit 1
        ) as check_in
on true
        left join lateral
(
          select jsonb_agg(
            jsonb_build_object(
              'event_field_id', ra.event_field_id,
              'field_type', ef.field_type,
              'field_key', ef.field_key,
              'label', ef.label,
              'answer_text',
                case
                  when ra.answer_text is not null then ra.answer_text
                  when ra.answer_boolean is not null then ra.answer_boolean::text
                  when ra.answer_date is not null then ra.answer_date::text
                  when ra.answer_json is not null then ra.answer_json::text
                  else null
                end,
              'answer_number',
                case
                  when ra.answer_text is not null then null
                  else ra.answer_number
                end
            )
            order by ef.display_order
          ) as answers
from public.registration_answers ra
    join public.event_fields ef on ef.id = ra.event_field_id
where ra.registration_id = r.id
        )
as registration_answers on true
        left join lateral
(
          select jsonb_agg(
            jsonb_build_object(
              'attendance_field_id', aa.attendance_field_id,
              'field_type', af.field_type,
              'field_key', af.field_key,
              'label', af.label,
              'answer_text', aa.answer_text,
              'answer_number', aa.answer_number
            )
            order by af.display_order
          ) as answers
from public.attendance_answers aa
    join public.attendance_fields af on af.id = aa.attendance_field_id
where aa.registration_id = r.id
        )
as attendance_answers on true
        left join lateral
(
          select jsonb_agg(
            jsonb_build_object(
              'slot', sr.slot,
              'recorded_at', sr.recorded_at
            )
            order by sr.recorded_at
          ) as records
from public.attendance_slot_records sr
where sr.check_in_id = check_in.check_in_id
        )
as slot_records on true
        where r.user_id = p_user_id
      )
select coalesce(jsonb_agg(item order by sort_key desc nulls last), '[]'
::jsonb)
    from history
  );
end;
$$;

commit;
