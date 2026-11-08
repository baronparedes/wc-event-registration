import type { RecruitmentActionContext } from '../types.ts';
import { getStepKeyForNumber, response, saveTransaction } from './helpers.ts';

export async function handleArchiveApplicant(context: RecruitmentActionContext): Promise<Response> {
  const { supabase, request, application, authUser, userId, normalizedEmail, corsHeaders } =
    context;

  if (application.status === 'deployed') {
    return response(
      400,
      { success: false, error: 'Deployed applicants cannot be archived' },
      corsHeaders,
    );
  }

  const archiveReason = request.notes?.trim();
  if (!archiveReason) {
    return response(400, { success: false, error: 'Archive reason is required' }, corsHeaders);
  }

  const { error: archiveError } = await supabase
    .from('recruitment_applications')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', application.id);

  if (archiveError) {
    return response(500, { success: false, error: 'Failed to archive applicant' }, corsHeaders);
  }

  // Resolve author name for transaction and recruiter notes thread
  const { data: memberUser } = await supabase
    .from('users')
    .select('full_name')
    .or(`auth_user_id.eq.${userId},email.ilike.${authUser.email ?? ''}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const authorName =
    memberUser?.full_name ||
    (authUser.user_metadata?.full_name as string | undefined) ||
    authUser.email?.split('@')[0] ||
    normalizedEmail;

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
      notes: `Archived: ${archiveReason}`,
      assignedReviewerId: userId,
      assignedReviewerName: authorName,
    },
  );

  return response(200, { success: true, status: 'archived' }, corsHeaders);
}

export async function handleRestoreApplicant(context: RecruitmentActionContext): Promise<Response> {
  const { supabase, request, application, authUser, userId, normalizedEmail, corsHeaders } =
    context;

  const restoreNotes = request.notes?.trim();

  const { error: restoreError } = await supabase
    .from('recruitment_applications')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', application.id);

  if (restoreError) {
    return response(500, { success: false, error: 'Failed to restore applicant' }, corsHeaders);
  }

  // Resolve author name for transaction and recruiter notes thread
  const { data: memberUser } = await supabase
    .from('users')
    .select('full_name')
    .or(`auth_user_id.eq.${userId},email.ilike.${authUser.email ?? ''}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const authorName =
    memberUser?.full_name ||
    (authUser.user_metadata?.full_name as string | undefined) ||
    authUser.email?.split('@')[0] ||
    normalizedEmail;

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
      notes: restoreNotes ? `Restored: ${restoreNotes}` : 'Applicant restored to active pipeline',
      assignedReviewerId: userId,
      assignedReviewerName: authorName,
    },
  );

  return response(200, { success: true, status: 'active' }, corsHeaders);
}
