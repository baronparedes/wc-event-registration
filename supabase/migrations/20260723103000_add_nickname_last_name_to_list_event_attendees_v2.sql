begin;

create or replace function public.list_event_attendees_v2 (p_event_id uuid) returns table (attendance_enabled boolean, results jsonb) language sql security definer stable
set
  search_path = public as $$
    with
        settings
        as
        (
            select coalesce(
    (
      select s.attendance_enabled
      from public.attendance_settings s
      where s.event_id = p_event_id
      limit 1
    ),
    false
  ) as attendance_enabled
        ),
        registered_attendees
        as
        (
            select
                u.full_name,
                jsonb_build_object(
      'attendee_kind', 'registered',
      'registration_id', r.id,
      'public_registration_id', null,
      'user_id', r.user_id,
      'member_id', u.member_id,
      'member_metadata', coalesce(u.metadata, '{}'
        
        
        ::jsonb),
      'nickname', coalesce
    (u.nickname, ''),
      'last_name', coalesce
    (u.last_name, ''),
      'full_name', u.full_name,
      'email', u.email,
      'role', nullif
    (btrim
    (u.role), ''),
      'category', nullif
    (btrim
    (u.category), ''),
      'registration_status', r.status,
      'submitted_at', r.submitted_at,
      'check_in_status', case when check_in.first_checked_in_at is null then 'not_checked_in' else 'checked_in'
end
,
      'official_check_in_time', check_in.first_checked_in_at,
      'registration_answers', coalesce
(registration_answers.answers, '[]'::jsonb),
      'attendance_answers', coalesce
(attendance_answers.answers, '[]'::jsonb)
    ) as attendee
  from public.registrations r
  join public.users u on u.id = r.user_id
  left join lateral
(
    select ci.first_checked_in_at
from public.attendance_check_ins ci
where ci.event_id = p_event_id
    and ci.registration_id = r.id
order by ci.first_checked_in_at asc
    limit 1
  ) as check_in
on true
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
  where r.event_id = p_event_id
    and r.status != 'cancelled'
),
public_attendees as
(
  select
    concat_ws(' ', pr.first_name, pr.last_name) as full_name,
    jsonb_build_object(
      'attendee_kind', 'public',
      'registration_id', pr.id,
      'public_registration_id', pr.id,
      'user_id', null,
      'member_id', 'Guest',
      'member_metadata', null,
      'nickname', pr.first_name,
      'last_name', pr.last_name,
      'full_name', concat_ws(' ', pr.first_name, pr.last_name),
      'email', pr.email,
      'role', null,
      'category', null,
      'registration_status', pr.status,
      'submitted_at', pr.submitted_at,
      'check_in_status', case when check_in.first_checked_in_at is null then 'not_checked_in' else 'checked_in' end,
      'official_check_in_time', check_in.first_checked_in_at,
      'registration_answers', coalesce(registration_answers.answers, '[]'
::jsonb),
      'attendance_answers', coalesce
(attendance_answers.answers, '[]'::jsonb)
    ) as attendee
  from public.public_registrations pr
  left join lateral
(
    select ci.first_checked_in_at
from public.attendance_check_ins ci
where ci.event_id = p_event_id
    and (ci.public_registration_id = pr.id or ci.registration_id = pr.id)
order by ci.first_checked_in_at asc
    limit 1
  ) as check_in
on true
  left join lateral
(
    select jsonb_agg(
      jsonb_build_object(
        'attendance_field_id', paa.attendance_field_id,
        'field_type', af.field_type,
        'field_key', af.field_key,
        'label', af.label,
        'answer_text', paa.answer_text,
        'answer_number', paa.answer_number
      )
      order by af.display_order
    ) as answers
from public.public_attendance_answers paa
    join public.attendance_fields af on af.id = paa.attendance_field_id
where paa.public_registration_id = pr.id
  )
as attendance_answers on true
  left join lateral
(
    select jsonb_agg(
      jsonb_build_object(
        'event_field_id', pra.event_field_id,
        'field_type', ef.field_type,
        'field_key', ef.field_key,
        'label', ef.label,
        'answer_text',
          case
            when pra.answer_text is not null then pra.answer_text
            when pra.answer_boolean is not null then pra.answer_boolean::text
            when pra.answer_date is not null then pra.answer_date::text
            when pra.answer_json is not null then pra.answer_json::text
            else null
          end,
        'answer_number',
          case
            when pra.answer_text is not null then null
            else pra.answer_number
          end
      )
      order by ef.display_order
    ) as answers
from public.public_registration_answers pra
    join public.event_fields ef on ef.id = pra.event_field_id
where pra.public_registration_id = pr.id
  )
as registration_answers on true
  where pr.event_id = p_event_id
    and pr.status != 'cancelled'
),
all_attendees as
    (
        select full_name, attendee
    from registered_attendees
union all
    select full_name, attendee
    from public_attendees
)
select
    s.attendance_enabled,
    case
    when s.attendance_enabled then coalesce(
      (
        select jsonb_agg(a.attendee order by a.full_name)
        from all_attendees a
      ),
      '[]'::jsonb
    )
    else '[]'
::jsonb
end as results
from settings s;
$$;

grant
execute on function public.list_event_attendees_v2 (uuid) to authenticated;

grant
execute on function public.list_event_attendees_v2 (uuid) to service_role;

commit;
