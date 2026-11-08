-- Migration: 20261104144000_remove_applicant_visible_notes_from_rpc.sql
-- Description: Suppress applicant_visible_notes from get_my_recruitment_application RPC to prevent accidental info leakage to applicants
begin;

create or replace function public.get_my_recruitment_application () returns jsonb language plpgsql security definer
set
  search_path = public as $$
declare
  v_application public.recruitment_applications%rowtype;
  v_approval_status text;
  v_timeline jsonb;
begin
  if auth.uid() is null then
    return null;
  end if;

  select application.*
  into v_application
  from public.recruitment_applications application
  where application.auth_user_id = auth.uid()
    or lower(application.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  order by
    case when application.status in ('active', 'archived', 'on_hold') then 0 else 1 end,
    application.created_at desc
  limit 1
  for update;

  if not found then
    return null;
  end if;

  if v_application.auth_user_id is null then
    update public.recruitment_applications
    set auth_user_id = auth.uid()
    where id = v_application.id;
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
    'application', jsonb_build_object(
      'id', v_application.id,
      'status', v_application.status,
      'current_step', v_application.current_step,
      'desired_role', v_application.desired_role,
      'confirmed_role', v_application.confirmed_role,
      'full_name', v_application.full_name,
      'created_at', v_application.created_at,
      'dgroup_info', v_application.dgroup_info,
      'dgroup_approval_id', v_application.dgroup_approval_id
    ),
    'dgroup_approval_status', v_approval_status,
    'timeline', v_timeline
  );
end;
$$;

commit;
