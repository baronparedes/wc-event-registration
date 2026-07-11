begin;

    -- Safety gate: refuse schema cleanup if any legacy walk-in rows still exist.
    do $$
    begin
        if exists (
    select 1
        from public.attendance_check_ins
        where walk_in_id is not null or attendee_kind::text = 'walk_in'
  ) then
    raise exception
      'Cannot remove walk-in schema: attendance_check_ins still has walk-in rows. Migrate or delete walk-in data first.';
end
if;

  if exists (select 1
from public.attendance_walk_ins) then
    raise exception
      'Cannot remove walk-in schema: attendance_walk_ins still has rows. Migrate or delete walk-in data first.';
end
if;
end
$$;

-- Remove walk-in indexes/constraints before dropping the column.
drop index if exists public.attendance_check_ins_unique_walk_in;

alter table public.attendance_check_ins
  drop constraint if exists attendance_check_ins_single_attendee_ref;

-- Remove walk-in relation.
alter table public.attendance_check_ins
  drop column if exists walk_in_id;

drop table if exists public.attendance_walk_ins;

-- Keep exactly one attendee reference: registered xor public.
alter table public.attendance_check_ins
  add constraint attendance_check_ins_single_attendee_ref
    check (
      (
        (case when registration_id is null then 0 else 1 end)
        + (case when public_registration_id is null then 0 else 1 end)
      ) = 1
    );

-- Rebuild enum without walk_in.
create type public.attendee_kind_v2 as enum
('registered', 'public');

alter table public.attendance_check_ins
  alter column attendee_kind type
public.attendee_kind_v2
  using attendee_kind::text::public.attendee_kind_v2;

drop type public.attendee_kind;
alter type public.attendee_kind_v2 rename to attendee_kind;

commit;
