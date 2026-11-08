-- Migration: 20261108025900_add_recruitment_application_access_token.sql
-- Description: Add access_token to recruitment_applications and create get_recruitment_application_by_token RPC
begin;

-- 1. Add access_token column to recruitment_applications if it doesn't exist
alter table public.recruitment_applications
add column if not exists access_token text not null default encode(gen_random_bytes (32), 'hex');

-- 2. Create unique index on access_token
create unique index if not exists idx_recruitment_applications_access_token on public.recruitment_applications (access_token);

-- 3. Create get_recruitment_application_by_token RPC
create or replace function public.get_recruitment_application_by_token (p_token text) returns jsonb language plpgsql security definer
set
  search_path = public as $$
declare
  v_application public.recruitment_applications%rowtype;
  v_approval_status text;
  v_timeline jsonb;
begin
  if p_token is null or trim(p_token) = '' then
    return null;
  end if;

  select application.*
  into v_application
  from public.recruitment_applications application
  where application.access_token = trim(p_token)
  limit 1;

  if not found then
    return null;
  end if;

  -- Expire if application is deployed, archived, or declined
  if v_application.status in ('deployed', 'archived', 'declined') then
    return jsonb_build_object(
      'expired', true,
      'status', v_application.status
    );
  end if;

  select approval.status::text
  into v_approval_status
  from public.approval_requests approval
  where approval.id = v_application.dgroup_approval_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'step_number', transaction.step_number,
        'step_key', transaction.step_key,
        'attempt_number', transaction.attempt_number,
        'status', transaction.status,
        'transaction_type', transaction.transaction_type,
        'scheduled_at', transaction.scheduled_at,
        'completed_at', transaction.completed_at,
        'assigned_reviewer_name', transaction.assigned_reviewer_name,
        'applicant_visible_notes', null,
        'created_at', transaction.created_at
      )
      order by transaction.created_at
    ),
    '[]'::jsonb
  )
  into v_timeline
  from public.recruitment_pipeline_transactions transaction
  where transaction.application_id = v_application.id;

  return jsonb_build_object(
    'expired', false,
    'id', v_application.id,
    'email', v_application.email,
    'first_name', v_application.first_name,
    'last_name', v_application.last_name,
    'full_name', v_application.full_name,
    'nickname', v_application.nickname,
    'avatar_object_key', v_application.avatar_object_key,
    'desired_role', v_application.desired_role,
    'confirmed_role', v_application.confirmed_role,
    'current_step', v_application.current_step,
    'status', v_application.status,
    'dgroup_approval_status', v_approval_status,
    'dgroup_leader_name', coalesce(v_application.dgroup_info ->> 'leader_name', ''),
    'vmt_registered', coalesce(v_application.vmt_registered, false),
    'service_commitments', coalesce(v_application.service_commitments, '{}'::jsonb),
    'assigned_rfid_member_id', v_application.assigned_rfid_member_id,
    'deployed_at', v_application.deployed_at,
    'transactions', v_timeline
  );
end;
$$;

revoke
execute on function public.get_recruitment_application_by_token (p_token text)
from
  public;

grant
execute on function public.get_recruitment_application_by_token (p_token text) to anon,
authenticated,
service_role;

-- 4. Update complete_recruitment_vmt_registration to allow null p_actor_user_id for token access
create or replace function public.complete_recruitment_vmt_registration (
  p_application_id uuid,
  p_actor_user_id uuid default null,
  p_actor_email text default null
) returns jsonb language plpgsql security definer
set
  search_path = public as $$
declare
  v_application public.recruitment_applications%rowtype;
  v_transaction_id uuid;
  v_transaction_status text;
  v_attempt_number integer;
begin
  if auth.role() <> 'service_role' and current_user <> 'service_role' then
    raise exception 'unauthorized';
  end if;

  if nullif(trim(p_actor_email), '') is null then
    raise exception 'Applicant identity is required';
  end if;

  select application.*
  into v_application
  from public.recruitment_applications application
  where application.id = p_application_id
  for update;

  if not found then
    raise exception 'Recruitment application not found';
  end if;

  if p_actor_user_id is not null and v_application.auth_user_id is not null then
    if v_application.auth_user_id <> p_actor_user_id then
      raise exception 'unauthorized';
    end if;
  elsif lower(v_application.email) <> lower(trim(p_actor_email)) then
    raise exception 'unauthorized';
  end if;

  if v_application.vmt_registered and v_application.current_step >= 8 then
    return jsonb_build_object(
      'success', true,
      'application_id', v_application.id,
      'current_step', v_application.current_step,
      'vmt_registered', true,
      'already_completed', true
    );
  end if;

  if v_application.current_step <> 7 then
    raise exception 'CCF VMT registration is not the current step';
  end if;

  select transaction.id, transaction.status
  into v_transaction_id, v_transaction_status
  from public.recruitment_pipeline_transactions transaction
  where transaction.application_id = v_application.id
    and transaction.step_number = 7
  order by transaction.attempt_number desc
  limit 1
  for update;

  if found and v_transaction_status not in ('completed', 'skipped', 'declined') then
    update public.recruitment_pipeline_transactions
    set transaction_type = 'completed',
        from_step = 7,
        to_step = 8,
        status = 'completed',
        completed_at = now(),
        created_by_user_id = coalesce(p_actor_user_id, created_by_user_id)
    where id = v_transaction_id;
  else
    select coalesce(max(transaction.attempt_number), 0) + 1
    into v_attempt_number
    from public.recruitment_pipeline_transactions transaction
    where transaction.application_id = v_application.id
      and transaction.step_number = 7;

    insert into public.recruitment_pipeline_transactions (
      application_id,
      step_number,
      step_key,
      attempt_number,
      transaction_type,
      from_step,
      to_step,
      status,
      created_by_user_id,
      completed_at
    )
    values (
      v_application.id,
      7,
      'vmt_registration',
      v_attempt_number,
      'completed',
      7,
      8,
      'completed',
      p_actor_user_id,
      now()
    );
  end if;

  update public.recruitment_applications
  set auth_user_id = coalesce(auth_user_id, p_actor_user_id),
      vmt_registered = true,
      vmt_registered_at = coalesce(vmt_registered_at, now()),
      current_step = 8
  where id = v_application.id;

  return jsonb_build_object(
    'success', true,
    'application_id', v_application.id,
    'current_step', 8,
    'vmt_registered', true,
    'already_completed', false
  );
end;
$$;

revoke
execute on function public.complete_recruitment_vmt_registration (uuid, uuid, text)
from
  public,
  anon,
  authenticated;

grant
execute on function public.complete_recruitment_vmt_registration (uuid, uuid, text) to service_role;

commit;
