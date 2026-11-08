import type {
  RecruitmentActionContext,
  RecruitmentRole,
  RecruitmentStepKey,
  RecruitmentTransactionUpdate,
  TransactionType,
} from '../types.ts';
import {
  asJson,
  findLatestTransaction,
  notifyApplicant,
  overrideRoles,
  response,
} from './helpers.ts';

const ACTION_TRANSACTION_TYPE_MAP: Record<string, TransactionType> = {
  return_to_observation: 'returned_to_observation',
  return_to_interview: 'returned_to_interview',
};

const ACTION_REPEAT_STEP_MAP: Record<string, number> = {
  return_to_interview: 2,
  return_to_observation: 4,
};

const STEP_KEY_MAP: Record<number, RecruitmentStepKey> = {
  2: 'interview',
  4: 'observation',
  5: 'evaluation',
};

const ACTION_NOTIFICATION_TITLE_MAP: Record<string, string> = {
  return_to_observation: 'Additional observation scheduled',
  return_to_interview: 'Additional interview scheduled',
};

export async function handleStepRepeat(context: RecruitmentActionContext): Promise<Response> {
  const { supabase, request, application, userId, adminRole, corsHeaders } = context;
  const action = request.action;
  const isReturnAction = action === 'return_to_interview' || action === 'return_to_observation';
  const stepNumber = request.step_number;
  if (!stepNumber) {
    return response(400, { success: false, error: 'step_number is required' }, corsHeaders);
  }
  if (
    application.current_step !== stepNumber &&
    !(action === 'return_to_observation' && (stepNumber === 4 || application.current_step === 5)) &&
    !(action === 'return_to_interview' && (stepNumber === 2 || application.current_step === 3))
  ) {
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
  if (currentTransaction.error) {
    return response(500, { success: false, error: 'Failed to read current session' }, corsHeaders);
  }
  if (!currentTransaction.data && !isReturnAction) {
    return response(409, { success: false, error: 'There is no session to repeat' }, corsHeaders);
  }

  const transactionType = ACTION_TRANSACTION_TYPE_MAP[action] ?? 'repeated_step';

  if (currentTransaction.data) {
    const updateCurrent: RecruitmentTransactionUpdate = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      transaction_type: transactionType,
      notes: request.notes !== undefined ? (request.notes ?? null) : currentTransaction.data.notes,
      applicant_visible_notes: null,
      rubric_data: asJson(request.rubric_data) ?? currentTransaction.data.rubric_data,
    };
    const { error: completeError } = await supabase
      .from('recruitment_pipeline_transactions')
      .update(updateCurrent)
      .eq('id', currentTransaction.data.id);
    if (completeError) {
      return response(
        500,
        { success: false, error: 'Failed to close current session' },
        corsHeaders,
      );
    }
  }

  const repeatStepNumber = ACTION_REPEAT_STEP_MAP[action] ?? stepNumber;
  const repeatStepKey = STEP_KEY_MAP[repeatStepNumber] ?? 'evaluation';
  let nextAttempt = (currentTransaction.data?.attempt_number ?? 0) + 1;
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
  const targetStatus = request.scheduled_at ? 'scheduled' : 'pending';
  const { error: repeatError } = await supabase.from('recruitment_pipeline_transactions').insert({
    application_id: application.id,
    step_number: repeatStepNumber,
    step_key: repeatStepKey,
    attempt_number: nextAttempt,
    transaction_type: transactionType,
    from_step: stepNumber,
    to_step: repeatStepNumber,
    status: targetStatus,
    scheduled_at: request.scheduled_at ?? null,
    assigned_reviewer_id:
      request.assigned_reviewer_id !== undefined ? request.assigned_reviewer_id : null,
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

  const nextStep = repeatStepNumber;
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
    ACTION_NOTIFICATION_TITLE_MAP[action] ?? 'Another session scheduled',
    'A new recruitment session has been scheduled.',
  );
  return response(200, { success: true, current_step: nextStep }, corsHeaders);
}
