-- Migration: 20261104200000_migrate_recruitment_avatar_to_users.sql
-- Description: Update deploy_recruitment_applicant RPC to copy avatar_object_key into public.users upon deployment
begin;

create or replace function public.deploy_recruitment_applicant (p_application_id uuid) returns jsonb language plpgsql security definer
set
  search_path = public as $$
declare
  v_application public.recruitment_applications%rowtype;
  v_user_id uuid;
  v_next_step_8_attempt integer;
  v_next_step_9_attempt integer;
begin
  if not (
    public.is_admin_or_slod()
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'unauthorized';
  end if;

  select application.*
  into v_application
  from public.recruitment_applications application
  where application.id = p_application_id
  for update;

  if not found then
    raise exception 'Recruitment application not found';
  end if;

  if v_application.status = 'deployed' and v_application.promoted_user_id is not null then
    return jsonb_build_object(
      'success', true,
      'application_id', v_application.id,
      'user_id', v_application.promoted_user_id,
      'member_id', v_application.assigned_rfid_member_id,
      'already_deployed', true
    );
  end if;

  if v_application.status <> 'active' or v_application.current_step <> 8 then
    raise exception 'Applicant must be active at Step 8 before deployment';
  end if;

  if v_application.confirmed_role is null then
    raise exception 'Applicant must have a confirmed role before deployment';
  end if;

  if not v_application.vmt_registered
    or nullif(trim(v_application.ccf_vmt_id), '') is null
    or v_application.ccf_vmt_date is null then
    raise exception 'CCF VMT registration must be completed and verified before deployment';
  end if;

  if nullif(trim(v_application.assigned_rfid_member_id), '') is null then
    raise exception 'An RFID member ID must be assigned before deployment';
  end if;

  if not exists (
    select 1
    from jsonb_each(v_application.service_commitments) as commitment(key, value)
    where commitment.key in ('first_sunday', 'second_sunday', 'third_sunday', 'fourth_sunday', 'fifth_sunday')
      and case jsonb_typeof(commitment.value)
        when 'array' then jsonb_array_length(commitment.value) > 0
        when 'string' then length(trim(commitment.value #>> '{}')) > 0
        when 'boolean' then commitment.value = 'true'::jsonb
        else false
      end
  ) then
    raise exception 'At least one Sunday service commitment is required before deployment';
  end if;

  select user_record.id
  into v_user_id
  from public.users user_record
  where lower(user_record.email) = lower(v_application.email)
  for update;

  if exists (
    select 1
    from public.users user_record
    where user_record.member_id = v_application.assigned_rfid_member_id
      and (v_user_id is null or user_record.id <> v_user_id)
  ) then
    raise exception 'Assigned RFID member ID is already in use';
  end if;

  insert into public.users (
    member_id,
    first_name,
    last_name,
    full_name,
    nickname,
    email,
    phone,
    date_of_birth,
    role,
    category,
    metadata,
    avatar_object_key,
    is_active
  )
  values (
    v_application.assigned_rfid_member_id,
    v_application.first_name,
    v_application.last_name,
    v_application.full_name,
    v_application.nickname,
    lower(v_application.email),
    v_application.phone,
    v_application.date_of_birth,
    v_application.confirmed_role,
    v_application.life_stage,
    v_application.service_commitments,
    v_application.avatar_object_key,
    true
  )
  on conflict (lower(email)) where email is not null
  do update set
    member_id = excluded.member_id,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    full_name = excluded.full_name,
    nickname = excluded.nickname,
    phone = excluded.phone,
    date_of_birth = excluded.date_of_birth,
    role = excluded.role,
    category = excluded.category,
    metadata = coalesce(public.users.metadata, '{}'::jsonb) || excluded.metadata,
    avatar_object_key = coalesce(excluded.avatar_object_key, public.users.avatar_object_key),
    is_active = true,
    updated_at = now()
  returning id into v_user_id;

  select coalesce(max(transaction.attempt_number), 0) + 1
  into v_next_step_8_attempt
  from public.recruitment_pipeline_transactions transaction
  where transaction.application_id = v_application.id
    and transaction.step_number = 8;

  select coalesce(max(transaction.attempt_number), 0) + 1
  into v_next_step_9_attempt
  from public.recruitment_pipeline_transactions transaction
  where transaction.application_id = v_application.id
    and transaction.step_number = 9;

  insert into public.recruitment_pipeline_transactions (
    application_id,
    step_number,
    step_key,
    attempt_number,
    transaction_type,
    from_step,
    to_step,
    status,
    assigned_reviewer_id,
    created_by_user_id,
    completed_at
  )
  values
    (
      v_application.id,
      8,
      'rfid_releasing',
      v_next_step_8_attempt,
      'completed',
      8,
      9,
      'completed',
      auth.uid(),
      auth.uid(),
      now()
    ),
    (
      v_application.id,
      9,
      'deployment',
      v_next_step_9_attempt,
      'completed',
      8,
      9,
      'completed',
      auth.uid(),
      auth.uid(),
      now()
    );

  update public.recruitment_applications
  set status = 'deployed',
      current_step = 9,
      promoted_user_id = v_user_id,
      deployed_at = now()
  where id = v_application.id;

  return jsonb_build_object(
    'success', true,
    'application_id', v_application.id,
    'user_id', v_user_id,
    'member_id', v_application.assigned_rfid_member_id,
    'already_deployed', false
  );
end;
$$;

revoke
execute on function public.deploy_recruitment_applicant (uuid)
from
  public,
  anon;

grant
execute on function public.deploy_recruitment_applicant (uuid) to authenticated,
service_role;

commit;
