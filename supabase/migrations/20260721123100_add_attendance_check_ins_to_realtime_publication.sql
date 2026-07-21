begin;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'attendance_check_ins'
  ) then
    execute 'alter publication supabase_realtime add table public.attendance_check_ins';
  end if;
end;
$$;

commit;
