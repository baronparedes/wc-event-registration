begin;

select
  extensions.plan (12);

create temporary table upcoming_sunday_email_fixture as
select
  gen_random_uuid() as user_id,
  public.get_nearest_upcoming_sunday (timezone ('Asia/Manila', now())::date) as sunday_date;

select
  extensions.is (
    public.format_sunday_commitment_slots ('9AM'),
    '9:00 AM',
    'formats a single shorthand slot'
  );

select
  extensions.is (
    public.format_sunday_commitment_slots ('["9AM","3PM"]'),
    '9:00 AM and 3:00 PM',
    'formats a stringified JSON array with two slots'
  );

select
  extensions.is (
    public.format_sunday_commitment_slots ('9AM, 12NN, 3PM'),
    '9:00 AM, 12:00 NN and 3:00 PM',
    'formats a csv string with three slots'
  );

select
  extensions.is (
    public.format_sunday_commitment_slots ('9AM, 12NN, 3PM', '12NN'),
    '9:00 AM, 12:00 NN (Excused) and 3:00 PM',
    'formats slots with partial excuse'
  );

select
  extensions.is (
    public.is_sunday_commitment_fully_excused ('9AM, 12NN', 'All'),
    true,
    'returns true when excused for All services'
  );

select
  extensions.is (
    public.is_sunday_commitment_fully_excused ('9AM, 12NN', '9AM'),
    false,
    'returns false when only partially excused'
  );

select
  extensions.is (
    public.is_sunday_commitment_fully_excused ('9AM', '9AM'),
    true,
    'returns true when all committed slots are excused'
  );

select
  extensions.is (
    public.format_sunday_commitment_slots (null),
    '',
    'returns an empty string for a null value'
  );

select
  extensions.is (
    public.format_sunday_commitment_slots ('   '),
    '',
    'returns an empty string for a blank value'
  );

insert into
  public.users (
    id,
    member_id,
    full_name,
    first_name,
    email,
    metadata
  )
select
  user_id,
  'email-reminder-' || user_id::text,
  'Email Reminder Member',
  'Reminder',
  'email-reminder-' || user_id::text || '@test.local',
  jsonb_build_object(
    case
      when ceil(date_part('day', sunday_date) / 7.0) = 1 then 'first_sunday'
      when ceil(date_part('day', sunday_date) / 7.0) = 2 then 'second_sunday'
      when ceil(date_part('day', sunday_date) / 7.0) = 3 then 'third_sunday'
      when ceil(date_part('day', sunday_date) / 7.0) = 4 then 'fourth_sunday'
      else 'fifth_sunday'
    end,
    '9AM,3PM'
  )
from
  upcoming_sunday_email_fixture;

select
  extensions.ok (
    public.generate_upcoming_sunday_email_reminders () >= 1,
    'enqueues at least one email reminder on the first run'
  );

select
  extensions.is (
    (
      select
        count(*)
      from
        public.email_reminder_logs
      where
        sunday_date = (
          select
            sunday_date
          from
            upcoming_sunday_email_fixture
        )
    ),
    1::bigint,
    'records a single log row for the upcoming Sunday'
  );

select
  extensions.is (
    public.generate_upcoming_sunday_email_reminders (),
    0,
    'is idempotent for the same Sunday'
  );

select
  *
from
  extensions.finish ();

rollback;
