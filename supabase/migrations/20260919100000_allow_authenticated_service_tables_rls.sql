begin;

-- 1. Service Attendance: Allow authenticated users to view their own attendance records
-- Patterned to users table RLS matching: admin viewers, direct auth.uid(), or session email matching on public.users
drop policy if exists "admin viewers can read service_attendance" on public.service_attendance;

drop policy if exists "users and admin viewers can read service_attendance" on public.service_attendance;

create policy "users and admin viewers can read service_attendance" on public.service_attendance for
select
  to authenticated using (
    public.is_admin_viewer ()
    or user_id = auth.uid ()
    or exists (
      select
        1
      from
        public.users u
      where
        u.id = service_attendance.user_id
        and u.email is not null
        and lower(u.email) = lower(auth.jwt () ->> 'email')
    )
  );

-- 2. Service Layouts: Allow authenticated users to view active layouts
drop policy if exists "admin viewers can read service_layouts" on public.service_layouts;

drop policy if exists "authenticated can read active service_layouts" on public.service_layouts;

create policy "authenticated can read active service_layouts" on public.service_layouts for
select
  to authenticated using (
    is_active = true
    or public.is_admin_viewer ()
  );

-- 3. Service Seats: Allow authenticated users to view seats of active layouts
drop policy if exists "admin viewers can read service_seats" on public.service_seats;

drop policy if exists "authenticated can read service_seats" on public.service_seats;

create policy "authenticated can read service_seats" on public.service_seats for
select
  to authenticated using (
    public.is_admin_viewer ()
    or exists (
      select
        1
      from
        public.service_layouts l
      where
        l.id = service_seats.layout_id
        and l.is_active = true
    )
  );

commit;
