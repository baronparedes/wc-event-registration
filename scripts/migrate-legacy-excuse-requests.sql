-- Manual Migration Script: Copy legacy excuse registrations to public.service_excuse_requests
-- Run this script manually in production or target environment when ready.
begin;

insert into
  public.service_excuse_requests (
    user_id,
    member_id,
    request_date,
    services,
    reason,
    status,
    created_at
  )
select distinct
  on (r.id) r.user_id,
  u.member_id,
  coalesce(
    ra_date.answer_date,
    case
      when ra_date.answer_text ~ '^\d{4}-\d{2}-\d{2}' then substring(
        ra_date.answer_text
        from
          1 for 10
      )::date
      else null
    end
  ) as request_date,
  case
    when ra_serv.answer_text is null
    or trim(ra_serv.answer_text) = '' then array['All Services']::text[]
    else string_to_array(
      replace(replace(ra_serv.answer_text, '[', ''), ']', ''),
      ', '
    )
  end as services,
  ra_reason.answer_text as reason,
  case
    when r.status = 'cancelled' then 'cancelled'
    else 'approved'
  end as status,
  r.created_at
from
  public.registrations r
  join public.users u on u.id = r.user_id
  join public.events e on e.id = r.event_id
  and (
    e.slug ilike '%excuse%'
    or e.title ilike '%excuse%'
  )
  join public.event_fields ef_date on ef_date.event_id = r.event_id
  and ef_date.field_key = 'request_date'
  join public.registration_answers ra_date on ra_date.registration_id = r.id
  and ra_date.event_field_id = ef_date.id
  left join public.event_fields ef_serv on ef_serv.event_id = r.event_id
  and ef_serv.field_key = 'services'
  left join public.registration_answers ra_serv on ra_serv.registration_id = r.id
  and ra_serv.event_field_id = ef_serv.id
  left join public.event_fields ef_reason on ef_reason.event_id = r.event_id
  and ef_reason.field_key = 'reason'
  left join public.registration_answers ra_reason on ra_reason.registration_id = r.id
  and ra_reason.event_field_id = ef_reason.id
where
  coalesce(
    ra_date.answer_date,
    case
      when ra_date.answer_text ~ '^\d{4}-\d{2}-\d{2}' then substring(
        ra_date.answer_text
        from
          1 for 10
      )::date
      else null
    end
  ) is not null
on conflict do nothing;

commit;
