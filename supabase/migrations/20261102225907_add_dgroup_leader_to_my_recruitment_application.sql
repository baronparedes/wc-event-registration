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
    raise exception 'unauthorized';
  end if;

  select application.*
  into v_application
  from public.recruitment_applications application
  where application.auth_user_id = auth.uid()
    or lower(application.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  order by
    case when application.status in ('active', 'on_hold') then 0 else 1 end,
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
        'applicant_visible_notes', transaction.applicant_visible_notes,
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
    'dgroup_leader_name', v_application.dgroup_info ->> 'leader_name',
    'vmt_registered', v_application.vmt_registered,
    'service_commitments', v_application.service_commitments,
    'assigned_rfid_member_id', v_application.assigned_rfid_member_id,
    'deployed_at', v_application.deployed_at,
    'transactions', v_timeline
  );
end;
$$;

revoke
execute on function public.get_my_recruitment_application ()
from
  public,
  anon;

grant
execute on function public.get_my_recruitment_application () to authenticated,
service_role;

commit;
