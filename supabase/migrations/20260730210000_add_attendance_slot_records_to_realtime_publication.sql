begin;

do $$
    begin
        if not exists (
    select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
            and schemaname = 'public'
            and tablename = 'attendance_slot_records'
  ) then
        execute 'alter publication supabase_realtime add table public.attendance_slot_records';
    end
    if;
end;
$$;

commit;
