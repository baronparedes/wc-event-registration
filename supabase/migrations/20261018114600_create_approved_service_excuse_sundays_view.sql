begin;

-- Create helper view for expanding single-date and date-range approved service excuses into Sundays
create or replace view public.approved_service_excuse_sundays as
select distinct
  ser.id as excuse_id,
  ser.user_id,
  ser.member_id,
  s.sunday_date,
  s.sunday_date::text as request_date_str,
  ser.services,
  array_to_string(ser.services, ', ') as services_str,
  ser.reason,
  ser.status,
  ser.is_long_leave
from
  public.service_excuse_requests ser
  cross join lateral (
    select
      (
        coalesce(ser.start_date, ser.request_date) + interval '1 day' * i
      )::date as sunday_date
    from
      generate_series(
        0,
        greatest(
          0,
          (
            coalesce(ser.end_date, ser.start_date, ser.request_date) - coalesce(ser.start_date, ser.request_date)
          )
        )
      ) as i
    where
      extract(
        dow
        from
          (
            coalesce(ser.start_date, ser.request_date) + interval '1 day' * i
          )
      ) = 0
  ) s
where
  ser.status = 'approved';

grant
select
  on public.approved_service_excuse_sundays to authenticated,
  service_role;

commit;
