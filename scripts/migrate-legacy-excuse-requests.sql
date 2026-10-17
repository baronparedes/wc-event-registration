-- Manual Migration Script: Copy legacy excuse registrations to public.service_excuse_requests
-- Run this script manually in production or target environment when ready.
begin;

-- Target event identifier: Match specifically by ID or slug
with
  target_event as (
    select
      id
    from
      public.events
    where
      id = 'e10c3d21-dafd-462a-bb4f-f6655333aee7'::uuid
      or slug = 'excuse-request-2026'
    limit
      1
  )
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
    when trim(ra_serv.answer_text) ~ '^\[' then array(
      select
        json_array_elements_text(trim(ra_serv.answer_text)::json)
    )
    else regexp_split_to_array(
      replace(
        replace(trim(ra_serv.answer_text), '"', ''),
        '''',
        ''
      ),
      '\s*,\s*'
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
  join target_event te on te.id = r.event_id
  join public.users u on u.id = r.user_id
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

-- Cleanup existing unparsed quotes or brackets in services arrays if already inserted
update public.service_excuse_requests
set
  services = array(
    select distinct
      trim(
        both '" []'
        from
          elem
      )
    from
      unnest(services) as s (elem_str),
      lateral regexp_split_to_table(elem_str, '\s*,\s*') as elem
    where
      trim(
        both '" []'
        from
          elem
      ) <> ''
  )
where
  exists (
    select
      1
    from
      unnest(services) as s (elem_str)
    where
      elem_str ~ '["\],]'
  );

commit;
