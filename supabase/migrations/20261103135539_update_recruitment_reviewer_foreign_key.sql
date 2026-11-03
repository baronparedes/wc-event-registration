begin;

-- Drop foreign key constraint on assigned_reviewer_id referencing auth.users(id)
-- so that reviewers can be assigned from public.users (volunteers, OIC, leaders) as well as auth users
alter table public.recruitment_pipeline_transactions
drop constraint if exists recruitment_pipeline_transactions_assigned_reviewer_id_fkey;

commit;
