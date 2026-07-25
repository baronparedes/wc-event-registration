begin;

alter table public.attendance_settings
drop constraint if exists attendance_settings_timeslots_when_enabled;

alter table public.attendance_settings
alter column timeslots
drop default;

alter table public.attendance_settings
alter column timeslots type jsonb using coalesce(to_jsonb(timeslots), '[]'::jsonb);

update public.attendance_settings
set
  timeslots = coalesce(
    (
      select
        jsonb_agg(
          jsonb_build_object(
            'slot_at',
            slot_value,
            'opens_at',
            null,
            'closes_at',
            null
          )
        )
      from
        jsonb_array_elements_text(timeslots) as slot_value
    ),
    '[]'::jsonb
  );

alter table public.attendance_settings
alter column timeslots
set default '[]'::jsonb;

alter table public.attendance_settings
add constraint attendance_settings_timeslots_is_array check (jsonb_typeof(timeslots) = 'array');

alter table public.attendance_settings
add constraint attendance_settings_timeslots_when_enabled check (
  (
    not timeslot_enabled
    and jsonb_array_length(timeslots) = 0
  )
  or (
    timeslot_enabled
    and jsonb_array_length(timeslots) > 0
  )
);

commit;
