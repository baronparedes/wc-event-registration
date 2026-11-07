import type { RecruitmentActionContext } from '../types.ts';
import { findLatestTransaction, response } from './helpers.ts';

export async function handleCancelSchedule({
  supabase,
  request,
  application,
  userId,
  authUser,
  adminRole,
  corsHeaders,
}: RecruitmentActionContext): Promise<Response> {
  const stepNumber = request.step_number;
  if (!stepNumber || stepNumber < 2 || stepNumber > 6) {
    return response(
      400,
      { success: false, error: 'Only Steps 2 to 6 have sessions that can be cancelled' },
      corsHeaders,
    );
  }

  const latest = await findLatestTransaction(supabase, application.id, stepNumber);
  if (latest.error) {
    return response(
      500,
      { success: false, error: 'Failed to read current recruitment session' },
      corsHeaders,
    );
  }

  if (!latest.data) {
    return response(
      404,
      { success: false, error: `No session found for Step ${stepNumber}` },
      corsHeaders,
    );
  }

  // Ensure attempt is open
  if (['completed', 'skipped', 'declined'].includes(latest.data.status)) {
    return response(
      409,
      { success: false, error: `Step ${stepNumber} has already been completed or closed` },
      corsHeaders,
    );
  }

  // Ensure session is actually scheduled
  if (!latest.data.scheduled_at && latest.data.status !== 'scheduled') {
    return response(
      409,
      {
        success: false,
        error: `Step ${stepNumber} does not have an active scheduled session to cancel`,
      },
      corsHeaders,
    );
  }

  const cancellationReason = request.notes?.trim();
  if (!cancellationReason) {
    return response(400, { success: false, error: 'Cancellation reason is required' }, corsHeaders);
  }

  // Update open attempt to pending and nullify scheduled_at and assigned reviewer
  const { error: updateError } = await supabase
    .from('recruitment_pipeline_transactions')
    .update({
      status: 'pending',
      scheduled_at: null,
      assigned_reviewer_id: null,
      assigned_reviewer_name: null,
      notes: `Schedule cancelled: ${cancellationReason}`,
    })
    .eq('id', latest.data.id);

  if (updateError) {
    console.error('Failed to cancel schedule:', updateError);
    return response(
      500,
      { success: false, error: 'Failed to update schedule status' },
      corsHeaders,
    );
  }

  // Resolve author profile for recruiter notes thread
  const { data: memberUser } = await supabase
    .from('users')
    .select('full_name, avatar_object_key')
    .or(`auth_user_id.eq.${userId},email.ilike.${authUser.email ?? ''}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const authorName =
    request.assigned_reviewer_name?.trim() ||
    memberUser?.full_name ||
    (authUser.user_metadata?.full_name as string | undefined) ||
    (authUser.user_metadata?.name as string | undefined) ||
    authUser.email?.split('@')[0] ||
    'Recruitment Reviewer';
  const authorRole = adminRole ? adminRole.toUpperCase() : null;
  const avatarObjectKey = memberUser?.avatar_object_key ?? null;

  // Insert note into recruitment_step_notes
  await supabase.from('recruitment_step_notes').insert({
    application_id: application.id,
    step_number: stepNumber,
    attempt_number: latest.data.attempt_number ?? 1,
    transaction_id: latest.data.id,
    author_id: userId,
    author_name: authorName,
    author_role: authorRole,
    avatar_object_key: avatarObjectKey,
    content: `Schedule cancelled: ${cancellationReason}`,
  });

  return response(
    200,
    {
      success: true,
      application_id: application.id,
      step_number: stepNumber,
      status: 'pending',
      scheduled_at: null,
      assigned_reviewer_id: null,
      assigned_reviewer_name: null,
    },
    corsHeaders,
  );
}
