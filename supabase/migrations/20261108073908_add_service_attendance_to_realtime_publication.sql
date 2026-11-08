begin;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'service_attendance'
  ) then
    execute 'alter publication supabase_realtime add table public.service_attendance';
  end if;
end;
$$;

commit;
