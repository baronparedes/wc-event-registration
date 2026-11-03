-- Allow 'returned_to_interview' in recruitment_pipeline_transaction_type_check constraint
alter table public.recruitment_pipeline_transactions
drop constraint if exists recruitment_pipeline_transaction_type_check;

alter table public.recruitment_pipeline_transactions
add constraint recruitment_pipeline_transaction_type_check check (
  transaction_type in (
    'scheduled',
    'rescheduled',
    'completed',
    'repeated_step',
    'returned_to_observation',
    'returned_to_interview',
    'skipped',
    'on_hold',
    'declined'
  )
);
