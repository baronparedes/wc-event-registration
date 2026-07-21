begin;

alter type public.attendee_kind
add value if not exists 'public';

alter table public.attendance_check_ins
add column if not exists public_registration_id uuid references public.public_registrations (id) on delete cascade;

drop index if exists public.attendance_check_ins_unique_public_registration;

create unique index attendance_check_ins_unique_public_registration on public.attendance_check_ins (event_id, public_registration_id)
where
  public_registration_id is not null;

alter table public.attendance_check_ins
drop constraint if exists attendance_check_ins_single_attendee_ref;

alter table public.attendance_check_ins
add constraint attendance_check_ins_single_attendee_ref check (
  (
    (
      case
        when registration_id is null then 0
        else 1
      end
    ) + (
      case
        when walk_in_id is null then 0
        else 1
      end
    ) + (
      case
        when public_registration_id is null then 0
        else 1
      end
    )
  ) = 1
);

commit;
