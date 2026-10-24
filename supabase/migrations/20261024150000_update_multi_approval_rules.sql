-- Migration: Update apply_approval_decision to support multi-approval rules and dynamic field answers
-- 1. Updates dynamic field answer in form_submission_answers to approved/rejected
-- 2. Checks all approval requests for the submission:
--    - If any request is rejected -> form_submission status = 'rejected' and auto-declines remaining pending requests
--    - If all requests are approved -> form_submission status = 'approved'
--    - If some approved and some still pending -> form_submission status stays 'pending_approval'
begin;

create or replace function public.apply_approval_decision (
  p_approval_id uuid,
  p_decision text,
  p_decision_notes text default null,
  p_decided_by_user_id uuid default null,
  p_decided_by_email text default null
) returns jsonb language plpgsql security definer
set
  search_path = public as $$
declare
  v_approval public.approval_requests%rowtype;
  v_target_status text;
  v_final_decision text := null;
  v_status_enum public.approval_status;
  v_pending_count int;
  v_rejected_count int;
  v_approved_count int;
  v_total_count int;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision: %', p_decision;
  end if;

  v_status_enum := p_decision::public.approval_status;

  select * into v_approval
  from public.approval_requests
  where id = p_approval_id
  for update;

  if not found then
    raise exception 'Approval request not found';
  end if;

  if v_approval.status <> 'pending' then
    return jsonb_build_object(
      'success', false,
      'error', 'Request already decided',
      'already_decided', true,
      'status', v_approval.status::text,
      'decided_at', v_approval.decided_at,
      'decided_by_email', v_approval.decided_by_email
    );
  end if;

  update public.approval_requests
  set status = v_status_enum,
      decided_by_user_id = coalesce(p_decided_by_user_id, auth.uid()),
      decided_by_email = coalesce(
        p_decided_by_email,
        (select email from public.users where id = p_decided_by_user_id),
        auth.jwt() ->> 'email'
      ),
      decided_at = now(),
      decision_notes = p_decision_notes,
      token_used_at = now(),
      updated_at = now()
  where id = p_approval_id;

  if v_approval.entity_type = 'form_submission' then
    -- 1. Update the specific dynamic field answer in form_submission_answers
    if (v_approval.metadata->>'form_field_id') is not null then
      update public.form_submission_answers
      set answer_text = p_decision,
          updated_at = now()
      where submission_id = v_approval.entity_id
        and form_field_id = (v_approval.metadata->>'form_field_id')::uuid;
    elsif (v_approval.metadata->>'field_key') is not null then
      update public.form_submission_answers a
      set answer_text = p_decision,
          updated_at = now()
      from public.form_fields f
      where a.submission_id = v_approval.entity_id
        and a.form_field_id = f.id
        and f.field_key = v_approval.metadata->>'field_key';
    end if;

    -- 2. Aggregate statuses of all approval requests for this form submission
    select
      count(*) filter (where status = 'pending'),
      count(*) filter (where status = 'rejected'),
      count(*) filter (where status = 'approved'),
      count(*)
    into
      v_pending_count,
      v_rejected_count,
      v_approved_count,
      v_total_count
    from public.approval_requests
    where entity_type = 'form_submission'
      and entity_id = v_approval.entity_id;

    -- 3. Multi-approval evaluation rule
    if v_rejected_count > 0 then
      v_target_status := 'rejected';
      v_final_decision := 'rejected';

      -- Auto-cancel/decline any remaining pending approval requests for this submission
      update public.approval_requests
      set status = 'rejected',
          decision_notes = coalesce(decision_notes, 'Auto-declined because another required approver rejected this submission.'),
          decided_at = now(),
          updated_at = now()
      where entity_type = 'form_submission'
        and entity_id = v_approval.entity_id
        and status = 'pending';

      -- Update any remaining pending form_submission_answers for required approval fields to rejected
      update public.form_submission_answers a
      set answer_text = 'rejected',
          updated_at = now()
      from public.form_fields f
      where a.submission_id = v_approval.entity_id
        and a.form_field_id = f.id
        and f.field_type = 'required_approval'
        and a.answer_text = 'pending_approval';

    elsif v_pending_count = 0 then
      -- All approval requests have been approved!
      v_target_status := 'approved';
      v_final_decision := 'approved';
    else
      -- Still awaiting one or more pending approvals
      v_target_status := 'pending_approval';
      v_final_decision := null;
    end if;

    update public.form_submissions
    set status = v_target_status,
        updated_at = now()
    where id = v_approval.entity_id;

  elsif v_approval.entity_type = 'service_excuse' then
    v_target_status := case when p_decision = 'approved' then 'approved' else 'rejected' end;
    v_final_decision := v_target_status;
    update public.service_excuse_requests
    set status = v_target_status,
        updated_at = now()
    where id = v_approval.entity_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'approval_id', p_approval_id,
    'status', p_decision,
    'entity_type', v_approval.entity_type::text,
    'entity_id', v_approval.entity_id,
    'requester_email', v_approval.requester_email,
    'requester_name', v_approval.requester_name,
    'title', v_approval.title,
    'submission_status', v_target_status,
    'final_decision', v_final_decision
  );
end;
$$;

revoke
execute on function public.apply_approval_decision (uuid, text, text, uuid, text)
from
  public;

grant
execute on function public.apply_approval_decision (uuid, text, text, uuid, text) to authenticated,
service_role;

commit;
