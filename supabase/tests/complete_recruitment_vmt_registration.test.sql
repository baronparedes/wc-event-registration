begin;

create temporary table tap_results (name text not null, pass boolean not null) on
commit
drop;

insert into
  auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  )
values
  (
    '00000000-0000-0000-0000-000000000910',
    'vmt-registration-test@example.com',
    'not-used',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  )
on conflict (id) do nothing;

insert into
  public.recruitment_applications (
    id,
    email,
    first_name,
    last_name,
    full_name,
    nickname,
    phone,
    date_of_birth,
    gender,
    life_stage,
    desired_role,
    current_step,
    status
  )
values
  (
    '00000000-0000-0000-0000-000000000911',
    'vmt-registration-test@example.com',
    'VMT',
    'Applicant',
    'VMT Applicant',
    'VMT',
    '+639171234567',
    '1990-01-01',
    'Female',
    'Single',
    'Usher',
    7,
    'active'
  )
on conflict (id) do nothing;

insert into
  public.recruitment_pipeline_transactions (
    application_id,
    step_number,
    step_key,
    attempt_number,
    transaction_type,
    from_step,
    to_step,
    status
  )
values
  (
    '00000000-0000-0000-0000-000000000911',
    7,
    'vmt_registration',
    1,
    'scheduled',
    6,
    7,
    'scheduled'
  )
on conflict (application_id, step_number, attempt_number) do nothing;

set
  local role service_role;

set
  local request.jwt.claims to '{"role":"service_role"}';

do $$
declare
  v_result jsonb;
  v_application public.recruitment_applications%rowtype;
  v_denied boolean := false;
begin
  begin
    perform public.complete_recruitment_vmt_registration(
      '00000000-0000-0000-0000-000000000911',
      '00000000-0000-0000-0000-000000000910',
      'attacker@example.com'
    );
  exception
    when others then
      v_denied := true;
  end;

  select * into v_application
  from public.recruitment_applications
  where id = '00000000-0000-0000-0000-000000000911';

  insert into tap_results (name, pass)
  values (
    'Rejects actor email mismatch without changing application state',
    v_denied and v_application.current_step = 7 and not v_application.vmt_registered
  );

  v_result := public.complete_recruitment_vmt_registration(
    '00000000-0000-0000-0000-000000000911',
    '00000000-0000-0000-0000-000000000910',
    'VMT-Registration-Test@example.com'
  );

  select * into v_application
  from public.recruitment_applications
  where id = '00000000-0000-0000-0000-000000000911';

  insert into tap_results (name, pass)
  values (
    'Completes Step 7, links the account, and advances atomically to Step 8',
    v_result->>'success' = 'true'
      and v_application.auth_user_id = '00000000-0000-0000-0000-000000000910'
      and v_application.current_step = 8
      and v_application.vmt_registered
      and exists (
        select 1
        from public.recruitment_pipeline_transactions transaction
        where transaction.application_id = v_application.id
          and transaction.step_number = 7
          and transaction.status = 'completed'
      )
  );

  v_result := public.complete_recruitment_vmt_registration(
    '00000000-0000-0000-0000-000000000911',
    '00000000-0000-0000-0000-000000000910',
    'vmt-registration-test@example.com'
  );

  insert into tap_results (name, pass)
  values (
    'Retry is idempotent and does not add another Step 7 transaction',
    v_result->>'already_completed' = 'true'
      and (
        select count(*) = 1
        from public.recruitment_pipeline_transactions transaction
        where transaction.application_id = '00000000-0000-0000-0000-000000000911'
          and transaction.step_number = 7
      )
  );
end
$$;

reset role;

insert into
  tap_results (name, pass)
values
  (
    'Authenticated role cannot execute the service-role-only RPC',
    not has_function_privilege(
      'authenticated',
      'public.complete_recruitment_vmt_registration(uuid,uuid,text)',
      'EXECUTE'
    )
  );

select
  extensions.plan (
    (
      select
        count(*)::integer
      from
        tap_results
    )
  );

select
  extensions.ok (pass, name)
from
  tap_results
order by
  name;

rollback;
