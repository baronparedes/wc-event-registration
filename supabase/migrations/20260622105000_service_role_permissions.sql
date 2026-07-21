begin;

-- Grant service role full access to all tables for Edge Functions
grant usage on schema public to service_role;

grant all on all tables in schema public to service_role;

grant all on all sequences in schema public to service_role;

commit;
