import type { RecruitmentActionContext } from '../types.ts';
import { findLatestTransaction, response } from './helpers.ts';

export async function handleAddNote(context: RecruitmentActionContext): Promise<Response> {
  const {
    supabase,
    request,
    application,
    authUser,
    userId,
    normalizedEmail,
    adminRole,
    corsHeaders,
  } = context;

  const stepNumber = request.step_number;
  const content = request.notes?.trim();
  if (!stepNumber || !content) {
    return response(
      400,
      { success: false, error: 'step_number and notes are required to add a note' },
      corsHeaders,
    );
  }

  const { data: memberUser } = await supabase
    .from('users')
    .select('id, full_name, nickname, avatar_object_key')
    .or(`auth_user_id.eq.${userId},email.ilike.${normalizedEmail}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const authorName =
    request.assigned_reviewer_name?.trim() ||
    memberUser?.full_name ||
    (authUser?.user_metadata?.full_name as string | undefined) ||
    (authUser?.user_metadata?.name as string | undefined) ||
    authUser?.email?.split('@')[0] ||
    'Recruitment Reviewer';
  const authorRole = adminRole ? adminRole.toUpperCase() : null;
  const avatarObjectKey = memberUser?.avatar_object_key ?? null;

  const latestTx = await findLatestTransaction(supabase, application.id, stepNumber);

  const { data: noteRecord, error: noteError } = await supabase
    .from('recruitment_step_notes')
    .insert({
      application_id: application.id,
      step_number: stepNumber,
      attempt_number: latestTx.data?.attempt_number ?? 1,
      transaction_id: latestTx.data?.id ?? null,
      author_id: userId,
      author_name: authorName,
      author_role: authorRole,
      avatar_object_key: avatarObjectKey,
      content,
    })
    .select('id, created_at')
    .single();

  if (noteError) {
    console.error('[update-recruitment-stage] Failed to record recruiter note:', noteError);
    return response(
      500,
      {
        success: false,
        error: `Failed to record recruiter note: ${noteError.message}`,
      },
      corsHeaders,
    );
  }

  return response(
    200,
    {
      success: true,
      note_id: noteRecord?.id,
      created_at: noteRecord?.created_at,
    },
    corsHeaders,
  );
}
