begin;

    -- Ensure API roles can access schema objects; row-level controls remain enforced by RLS.
    grant usage on schema public to anon, authenticated;

-- Public registration pages must read published events and event fields.
grant select on table public.events to anon, authenticated;
grant select on table public.event_fields to anon, authenticated;

-- Authenticated role needs table privileges for admin workflows; RLS still limits rows/actions.
grant select, insert, update, delete on table public.users to authenticated;
grant select, insert, update, delete on table public.admins to authenticated;
grant select, insert, update, delete on table public.events to authenticated;
grant select, insert, update, delete on table public.event_fields to authenticated;
grant select, insert, update, delete on table public.registrations to authenticated;
grant select, insert, update, delete on table public.registration_answers to authenticated;
grant select, insert, update, delete on table public.users_import_staging to authenticated;
grant select, insert, update, delete on table public.import_errors to authenticated;

commit;