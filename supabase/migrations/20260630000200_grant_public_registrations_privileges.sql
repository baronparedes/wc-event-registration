begin;

    -- Grant privileges for public registration tables

    -- Public attendees can insert/select/update their own registrations
    grant insert, select, update on table public.public_registrations to anon;

-- Public attendees can insert/select their own answers
grant insert, select on table public.public_registration_answers to anon;

-- Authenticated (admin) needs full privileges for admin workflows
grant select, insert, update, delete on table public.public_registrations to authenticated;
grant select, insert, update, delete on table public.public_registration_answers to authenticated;

-- Service role needs full privileges for Edge Functions
grant all on table public.public_registrations to service_role;
grant all on table public.public_registration_answers to service_role;

commit;
