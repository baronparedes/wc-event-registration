begin;

    create policy "admins and slod can insert attendance saved views"
  on public.attendance_saved_views for
    insert to authenticated
  with check (public.
    is_admin_or_slod()
    );

create policy "admins and slod can update attendance saved views"
  on public.attendance_saved_views for
update to authenticated
  using (public.is_admin_or_slod())
with check
(public.is_admin_or_slod
());

commit;