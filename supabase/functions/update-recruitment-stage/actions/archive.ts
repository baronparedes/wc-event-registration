import type { RecruitmentActionContext } from '../types.ts';
import { getStepKeyForNumber, response, saveTransaction } from './helpers.ts';

export async function handleArchiveApplicant(context: RecruitmentActionContext): Promise<Response> {
  const { supabase, request, application, userId, normalizedEmail, corsHeaders } = context;

  const { error: archiveError } = await supabase
    .from('recruitment_applications')
    .update({ status: 'archived' })
    .eq('id', application.id);

  if (archiveError) {
    return response(500, { success: false, error: 'Failed to archive applicant' }, corsHeaders);
  }

  const stepKey = getStepKeyForNumber(application.current_step);
  await saveTransaction(
    supabase,
    application,
    application.current_step,
    stepKey,
    'pending',
    'archived',
    userId,
    {
      notes: request.notes ?? 'Applicant moved to archived',
      assignedReviewerId: userId,
      assignedReviewerName: normalizedEmail,
    },
  );

  return response(200, { success: true, status: 'archived' }, corsHeaders);
}

export async function handleRestoreApplicant(context: RecruitmentActionContext): Promise<Response> {
  const { supabase, request, application, userId, normalizedEmail, corsHeaders } = context;

  const { error: restoreError } = await supabase
    .from('recruitment_applications')
    .update({ status: 'active' })
    .eq('id', application.id);

  if (restoreError) {
    return response(500, { success: false, error: 'Failed to restore applicant' }, corsHeaders);
  }

  const stepKey = getStepKeyForNumber(application.current_step);
  await saveTransaction(
    supabase,
    application,
    application.current_step,
    stepKey,
    'pending',
    'restored',
    userId,
    {
      notes: request.notes ?? 'Applicant restored to active pipeline',
      assignedReviewerId: userId,
      assignedReviewerName: normalizedEmail,
    },
  );

  return response(200, { success: true, status: 'active' }, corsHeaders);
}
