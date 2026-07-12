do $
$
begin
    alter table public.attendance_settings
        add column
    if not exists offline_check_in_queue_enabled boolean not null default false;
end $$;