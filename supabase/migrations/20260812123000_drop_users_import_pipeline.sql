begin;

-- Remove import pipeline objects now that this flow is retired.
drop function if exists public.process_members_import_batch (uuid, boolean);

drop table if exists public.import_errors;

drop table if exists public.users_import_staging;

commit;
