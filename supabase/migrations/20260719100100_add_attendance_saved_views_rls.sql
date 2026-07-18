begin;

alter table public.attendance_saved_views enable row level security;

create policy "admins can manage attendance_saved_views"
  on public.attendance_saved_views for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;
