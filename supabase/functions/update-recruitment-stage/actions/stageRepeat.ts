import type {
  RecruitmentActionContext,
  RecruitmentRole,
  RecruitmentTransactionUpdate,
} from '../types.ts';
import {
  asJson,
  findLatestTransaction,
  notifyApplicant,
  overrideRoles,
  response,
} from './helpers.ts';

export async function handleStepRepeat(context: RecruitmentActionContext): Promise<Response> {
  const { supabase, request, application, userId, adminRole, corsHeaders } = context;
  const action = request.action;

  const stepNumber = request.step_number;
  if (!stepNumber) {
    return response(400, { success: false, error: 'step_number is required' }, corsHeaders);
  }
  if (application.current_step !== stepNumber) {
    return response(
      409,
      { success: false, error: 'Only the current step can be repeated' },
      corsHeaders,
    );
  }
  if (request.override_endorsement_gate && !overrideRoles.has(adminRole ?? '')) {
    return response(
      403,
      { success: false, error: 'Only admins can override the endorsement gate' },
      corsHeaders,
    );
  }
  if (stepNumber >= 4 && !request.override_endorsement_gate) {
    const { data: approval } = await supabase
      .from('approval_requests')
      .select('status')
      .eq('id', application.dgroup_approval_id ?? '')
      .maybeSingle();
    if (approval?.status !== 'approved') {
      return response(
        409,
        { success: false, error: 'DGroup leader endorsement is required before observation' },
        corsHeaders,
      );
    }
  }

  const currentTransaction = await findLatestTransaction(supabase, application.id, stepNumber);
  if (currentTransaction.error || !currentTransaction.data) {
    return response(409, { success: false, error: 'There is no session to repeat' }, corsHeaders);
  }
  const updateCurrent: RecruitmentTransactionUpdate = {
    status: 'completed',
    completed_at: new Date().toISOString(),
    transaction_type:
      action === 'return_to_observation'
        ? 'returned_to_observation'
        : action === 'return_to_interview'
          ? 'returned_to_interview'
          : 'repeated_step',
    notes: request.notes !== undefined ? (request.notes ?? null) : currentTransaction.data.notes,
    applicant_visible_notes: null,
    rubric_data: asJson(request.rubric_data) ?? currentTransaction.data.rubric_data,
  };
  const { error: completeError } = await supabase
    .from('recruitment_pipeline_transactions')
    .update(updateCurrent)
    .eq('id', currentTransaction.data.id);
  if (completeError) {
    return response(500, { success: false, error: 'Failed to close current session' }, corsHeaders);
  }

  const repeatStepNumber =
    action === 'return_to_interview' ? 2 : action === 'return_to_observation' ? 4 : stepNumber;
  const repeatStepKey =
    repeatStepNumber === 2 ? 'interview' : repeatStepNumber === 4 ? 'observation' : 'evaluation';
  let nextAttempt = currentTransaction.data.attempt_number + 1;
  if (repeatStepNumber !== stepNumber) {
    const latestRepeat = await findLatestTransaction(supabase, application.id, repeatStepNumber);
    if (latestRepeat.error) {
      return response(
        500,
        { success: false, error: 'Failed to read previous step history' },
        corsHeaders,
      );
    }
    nextAttempt = latestRepeat.data ? latestRepeat.data.attempt_number + 1 : 1;
  }
  const { error: repeatError } = await supabase.from('recruitment_pipeline_transactions').insert({
    application_id: application.id,
    step_number: repeatStepNumber,
    step_key: repeatStepKey,
    attempt_number: nextAttempt,
    transaction_type:
      action === 'return_to_observation'
        ? 'returned_to_observation'
        : action === 'return_to_interview'
          ? 'returned_to_interview'
          : 'repeated_step',
    from_step: stepNumber,
    to_step: repeatStepNumber,
    status: 'scheduled',
    scheduled_at: request.scheduled_at ?? null,
    assigned_reviewer_id: request.assigned_reviewer_id ?? userId,
    assigned_reviewer_name: request.assigned_reviewer_name ?? null,
    created_by_user_id: userId,
  });
  if (repeatError) {
    return response(
      500,
      { success: false, error: 'Failed to schedule the next session' },
      corsHeaders,
    );
  }

  const nextStep =
    action === 'return_to_interview' ? 2 : action === 'return_to_observation' ? 4 : stepNumber;
  const appUpdate: { current_step: number; confirmed_role?: RecruitmentRole } = {
    current_step: nextStep,
  };
  if (request.confirmed_role) {
    appUpdate.confirmed_role = request.confirmed_role;
  }
  const { error: applicationUpdateError } = await supabase
    .from('recruitment_applications')
    .update(appUpdate)
    .eq('id', application.id);
  if (applicationUpdateError) {
    return response(
      500,
      { success: false, error: 'Failed to update recruitment progress' },
      corsHeaders,
    );
  }
  await notifyApplicant(
    supabase,
    application,
    userId,
    action === 'return_to_observation'
      ? 'Additional observation scheduled'
      : action === 'return_to_interview'
        ? 'Additional interview scheduled'
        : 'Another session scheduled',
    'A new recruitment session has been scheduled.',
  );
  return response(200, { success: true, current_step: nextStep }, corsHeaders);
}
