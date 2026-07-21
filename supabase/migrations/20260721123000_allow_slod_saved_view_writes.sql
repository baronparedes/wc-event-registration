begin;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'attendance_saved_views'
      and policyname = 'admins and slod can insert attendance saved views'
  ) then
    create policy "admins and slod can insert attendance saved views"
      on public.attendance_saved_views for insert to authenticated
      with check (public.is_admin_or_slod());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'attendance_saved_views'
      and policyname = 'admins and slod can update attendance saved views'
  ) then
    create policy "admins and slod can update attendance saved views"
      on public.attendance_saved_views for update to authenticated
      using (public.is_admin_or_slod())
      with check (public.is_admin_or_slod());
  end if;
end;
$$;

commit;
