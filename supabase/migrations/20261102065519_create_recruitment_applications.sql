begin;

create table if not exists public.recruitment_applications (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users (id) on delete set null,
  email text not null,
  first_name text not null,
  middle_name text,
  last_name text not null,
  full_name text not null,
  nickname text not null,
  phone text not null,
  date_of_birth date not null,
  gender text not null,
  life_stage text not null,
  avatar_object_key text,
  desired_role text not null,
  confirmed_role text,
  personal_details jsonb not null default '{}'::jsonb,
  emergency_contact jsonb not null default '{}'::jsonb,
  application_history jsonb not null default '{}'::jsonb,
  spiritual_background jsonb not null default '{}'::jsonb,
  dgroup_info jsonb not null default '{}'::jsonb,
  applicant_attested_at timestamptz not null default now(),
  survey_answers jsonb not null default '{}'::jsonb,
  survey_score integer not null default 0,
  survey_total integer not null default 0,
  current_step integer not null default 1,
  status text not null default 'active',
  dgroup_approval_id uuid references public.approval_requests (id) on delete set null,
  vmt_registered boolean not null default false,
  ccf_vmt_id text,
  ccf_vmt_date date,
  vmt_registered_at timestamptz,
  vmt_verified_by uuid references auth.users (id) on delete set null,
  service_commitments jsonb not null default '{}'::jsonb,
  assigned_rfid_member_id text,
  promoted_user_id uuid references public.users (id) on delete set null,
  deployed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitment_applications_email_not_blank check (length(trim(email)) > 0),
  constraint recruitment_applications_first_name_not_blank check (length(trim(first_name)) > 0),
  constraint recruitment_applications_last_name_not_blank check (length(trim(last_name)) > 0),
  constraint recruitment_applications_full_name_not_blank check (length(trim(full_name)) > 0),
  constraint recruitment_applications_nickname_not_blank check (length(trim(nickname)) > 0),
  constraint recruitment_applications_phone_not_blank check (length(trim(phone)) > 0),
  constraint recruitment_applications_gender_check check (gender in ('Male', 'Female')),
  constraint recruitment_applications_desired_role_check check (
    desired_role in (
      'Prayer Coach',
      'Usher',
      'Backroom Support',
      'IMT Support',
      'VMT Support'
    )
  ),
  constraint recruitment_applications_confirmed_role_check check (
    confirmed_role is null
    or confirmed_role in (
      'Prayer Coach',
      'Usher',
      'Backroom Support',
      'IMT Support',
      'VMT Support'
    )
  ),
  constraint recruitment_applications_current_step_check check (current_step between 1 and 9),
  constraint recruitment_applications_status_check check (
    status in (
      'active',
      'on_hold',
      'deployed',
      'declined',
      'withdrawn'
    )
  ),
  constraint recruitment_applications_survey_score_check check (
    survey_score >= 0
    and survey_total >= survey_score
  ),
  constraint recruitment_applications_personal_details_object check (jsonb_typeof(personal_details) = 'object'),
  constraint recruitment_applications_emergency_contact_object check (jsonb_typeof(emergency_contact) = 'object'),
  constraint recruitment_applications_application_history_object check (jsonb_typeof(application_history) = 'object'),
  constraint recruitment_applications_spiritual_background_object check (jsonb_typeof(spiritual_background) = 'object'),
  constraint recruitment_applications_dgroup_info_object check (jsonb_typeof(dgroup_info) = 'object'),
  constraint recruitment_applications_survey_answers_object check (jsonb_typeof(survey_answers) = 'object'),
  constraint recruitment_applications_service_commitments_object check (jsonb_typeof(service_commitments) = 'object')
);

create index if not exists recruitment_applications_email_lower_idx on public.recruitment_applications (lower(email));

create index if not exists recruitment_applications_auth_user_id_idx on public.recruitment_applications (auth_user_id);

create index if not exists recruitment_applications_status_step_idx on public.recruitment_applications (status, current_step, created_at desc);

create index if not exists recruitment_applications_created_at_idx on public.recruitment_applications (created_at desc);

alter table public.recruitment_applications enable row level security;

drop policy if exists "recruitment reviewers can read applications" on public.recruitment_applications;

create policy "recruitment reviewers can read applications" on public.recruitment_applications for
select
  to authenticated using (public.is_recruitment_reviewer ());

revoke all on public.recruitment_applications
from
  public,
  anon,
  authenticated;

grant
select
  on public.recruitment_applications to authenticated;

grant all on public.recruitment_applications to service_role;

drop trigger if exists recruitment_applications_set_updated_at on public.recruitment_applications;

create trigger recruitment_applications_set_updated_at
before update on public.recruitment_applications for each row
execute function public.set_updated_at ();

create table if not exists public.recruitment_pipeline_transactions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.recruitment_applications (id) on delete cascade,
  step_number integer not null,
  step_key text not null,
  attempt_number integer not null default 1,
  transaction_type text not null,
  from_step integer,
  to_step integer,
  status text not null default 'pending',
  assigned_reviewer_id uuid references auth.users (id) on delete set null,
  assigned_reviewer_name text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  rubric_data jsonb not null default '{}'::jsonb,
  notes text,
  applicant_visible_notes text,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint recruitment_pipeline_step_number_check check (step_number between 1 and 9),
  constraint recruitment_pipeline_step_key_check check (
    step_key in (
      'register',
      'interview',
      'orientation',
      'observation',
      'evaluation',
      'onboarding',
      'vmt_registration',
      'rfid_releasing',
      'deployment'
    )
  ),
  constraint recruitment_pipeline_attempt_number_check check (attempt_number > 0),
  constraint recruitment_pipeline_transaction_type_check check (
    transaction_type in (
      'scheduled',
      'rescheduled',
      'completed',
      'repeated_step',
      'returned_to_observation',
      'skipped',
      'on_hold',
      'declined'
    )
  ),
  constraint recruitment_pipeline_status_check check (
    status in (
      'locked',
      'pending',
      'scheduled',
      'in_progress',
      'completed',
      'skipped',
      'declined'
    )
  ),
  constraint recruitment_pipeline_from_step_check check (
    from_step is null
    or from_step between 1 and 9
  ),
  constraint recruitment_pipeline_to_step_check check (
    to_step is null
    or to_step between 1 and 9
  ),
  constraint recruitment_pipeline_rubric_object check (jsonb_typeof(rubric_data) = 'object')
);

create unique index if not exists recruitment_pipeline_application_step_attempt_idx on public.recruitment_pipeline_transactions (application_id, step_number, attempt_number);

create index if not exists recruitment_pipeline_application_created_idx on public.recruitment_pipeline_transactions (application_id, created_at desc);

create index if not exists recruitment_pipeline_step_schedule_idx on public.recruitment_pipeline_transactions (step_number, scheduled_at desc)
where
  scheduled_at is not null;

alter table public.recruitment_pipeline_transactions enable row level security;

drop policy if exists "recruitment reviewers can read pipeline transactions" on public.recruitment_pipeline_transactions;

create policy "recruitment reviewers can read pipeline transactions" on public.recruitment_pipeline_transactions for
select
  to authenticated using (public.is_recruitment_reviewer ());

revoke all on public.recruitment_pipeline_transactions
from
  public,
  anon,
  authenticated;

grant
select
  on public.recruitment_pipeline_transactions to authenticated;

grant all on public.recruitment_pipeline_transactions to service_role;

create or replace view public.recruitment_application_latest_schedules_view
with
  (security_invoker = true) as
select
  application.id as application_id,
  latest.scheduled_interview_on,
  latest.scheduled_orientation_on,
  latest.scheduled_observation_on,
  latest.scheduled_evaluation_on,
  latest.scheduled_operations_onboarding_on,
  counts.observation_count,
  counts.evaluation_count
from
  public.recruitment_applications application
  left join lateral (
    select
      max(transaction.scheduled_at) filter (
        where
          transaction.step_number = 2
      ) as scheduled_interview_on,
      max(transaction.scheduled_at) filter (
        where
          transaction.step_number = 3
      ) as scheduled_orientation_on,
      max(transaction.scheduled_at) filter (
        where
          transaction.step_number = 4
      ) as scheduled_observation_on,
      max(transaction.scheduled_at) filter (
        where
          transaction.step_number = 5
      ) as scheduled_evaluation_on,
      max(transaction.scheduled_at) filter (
        where
          transaction.step_number = 6
      ) as scheduled_operations_onboarding_on
    from
      public.recruitment_pipeline_transactions transaction
    where
      transaction.application_id = application.id
  ) latest on true
  left join lateral (
    select
      count(*) filter (
        where
          transaction.step_number = 4
      )::integer as observation_count,
      count(*) filter (
        where
          transaction.step_number = 5
      )::integer as evaluation_count
    from
      public.recruitment_pipeline_transactions transaction
    where
      transaction.application_id = application.id
  ) counts on true;

grant
select
  on public.recruitment_application_latest_schedules_view to authenticated;

grant all on public.recruitment_application_latest_schedules_view to service_role;

commit;
