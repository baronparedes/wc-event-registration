import { createApprovalRequest, enqueueApprovalReviewEmail } from '@/shared/approvals.ts';

import { dgroupInfoSchema } from '../schemas.ts';
import type { RecruitmentActionContext } from '../types.ts';
import { createApprovalAccessToken, findLatestTransaction, response } from './helpers.ts';

export async function handleRequestEndorsement(
  context: RecruitmentActionContext,
): Promise<Response> {
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

  if (application.status !== 'active') {
    return response(
      400,
      { success: false, error: 'Cannot request endorsement for inactive application' },
      corsHeaders,
    );
  }

  const leaderName = request.leader_name?.trim();
  const leaderEmail = request.leader_email?.trim().toLowerCase();
  const leaderPhone = request.leader_contact_number?.trim() || null;
  const reasonNotes = request.notes?.trim() || null;

  if (!leaderName || !leaderEmail) {
    return response(
      400,
      { success: false, error: 'leader_name and leader_email are required' },
      corsHeaders,
    );
  }

  // 1. Cancel any existing open / pending endorsements for this application
  const { data: pendingApprovals } = await supabase
    .from('approval_requests')
    .select('id, assigned_to_email')
    .eq('entity_type', 'recruitment_endorsement')
    .eq('entity_id', application.id)
    .eq('status', 'pending');

  if (pendingApprovals && pendingApprovals.length > 0) {
    const cancelReason = reasonNotes
      ? `Superseded by new endorsement request to ${leaderName} (${leaderEmail}): ${reasonNotes}`
      : `Superseded by new endorsement request to ${leaderName} (${leaderEmail})`;

    const pendingIds = pendingApprovals.map((p) => p.id);
    await supabase
      .from('approval_requests')
      .update({
        status: 'cancelled',
        decision_notes: cancelReason,
        decided_at: new Date().toISOString(),
        decided_by_email: normalizedEmail,
        decided_by_user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .in('id', pendingIds);
  }

  // 2. Update recruitment_applications dgroup_info
  const currentDGroup =
    typeof application.dgroup_info === 'object' && application.dgroup_info !== null
      ? (application.dgroup_info as Record<string, unknown>)
      : {};

  const updatedDGroupInfo = {
    ...currentDGroup,
    leader_name: leaderName,
    leader_email: leaderEmail,
    leader_phone: leaderPhone || (currentDGroup.leader_phone as string | undefined) || '',
  };

  // 3. Create new approval request
  const approvalResult = await createApprovalRequest(supabase, {
    entityType: 'recruitment_endorsement',
    entityId: application.id,
    title: `DGroup Leader Endorsement - ${application.full_name}`,
    summary: `Endorsement request for ${application.full_name} applying for ${application.desired_role}`,
    requesterName: application.full_name,
    requesterEmail: application.email,
    assignedToEmail: leaderEmail,
    metadata: {
      application_id: application.id,
      avatar_object_key: application.avatar_object_key || null,
      leader_name: leaderName,
      leader_phone: leaderPhone,
      request_notes: reasonNotes,
    },
  });

  if (!approvalResult.success || !approvalResult.approval) {
    return response(
      500,
      { success: false, error: approvalResult.error || 'Failed to create endorsement request' },
      corsHeaders,
    );
  }

  // 4. Update application's dgroup_approval_id and dgroup_info
  const { error: appUpdateError } = await supabase
    .from('recruitment_applications')
    .update({
      dgroup_approval_id: approvalResult.approval.id,
      dgroup_info: updatedDGroupInfo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', application.id);

  if (appUpdateError) {
    return response(
      500,
      { success: false, error: 'Failed to link endorsement request to application' },
      corsHeaders,
    );
  }

  // 5. Enqueue endorsement email to leader
  const emailResult = await enqueueApprovalReviewEmail(supabase, {
    assignedToEmail: leaderEmail,
    subjectTitle: `Welcome Center Volunteer Endorsement - ${application.full_name}`,
    heading: 'DGroup Leader Endorsement Required',
    description: 'A member of your DGroup has applied to serve in the Welcome Center ministry.',
    details: [
      { label: 'Applicant', value: application.full_name },
      { label: 'Desired Role', value: application.desired_role },
      ...(reasonNotes ? [{ label: 'Note from Admin', value: reasonNotes }] : []),
    ],
    accessToken: approvalResult.approval.access_token,
    approvalId: approvalResult.approval.id,
  });

  if (!emailResult.success) {
    console.error('Failed to enqueue endorsement email');
  }

  // 6. Record an audit note on Step 1 (Survey & Endorsement review)
  const auditContent = reasonNotes
    ? `Endorsement request dispatched to ${leaderName} (${leaderEmail}). Note: ${reasonNotes}`
    : `Endorsement request dispatched to ${leaderName} (${leaderEmail}).`;

  const { data: memberUser } = await supabase
    .from('users')
    .select('id, full_name, nickname, avatar_object_key')
    .or(`auth_user_id.eq.${userId},email.ilike.${normalizedEmail}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const authorName =
    memberUser?.full_name ||
    (authUser.user_metadata?.full_name as string | undefined) ||
    authUser.email?.split('@')[0] ||
    'Recruitment Reviewer';
  const authorRole = adminRole ? adminRole.toUpperCase() : null;

  const latestTx = await findLatestTransaction(supabase, application.id, 1);

  await supabase.from('recruitment_step_notes').insert({
    application_id: application.id,
    step_number: 1,
    attempt_number: latestTx.data?.attempt_number ?? 1,
    transaction_id: latestTx.data?.id ?? null,
    author_id: userId,
    author_name: authorName,
    author_role: authorRole,
    avatar_object_key: memberUser?.avatar_object_key ?? null,
    content: auditContent,
  });

  return response(
    200,
    {
      success: true,
      approval_id: approvalResult.approval.id,
    },
    corsHeaders,
  );
}

export async function handleResendEndorsement(
  context: RecruitmentActionContext,
): Promise<Response> {
  const { supabase, application, userId, isReviewer, corsHeaders } = context;

  if (!isReviewer && application.auth_user_id !== userId) {
    return response(
      404,
      { success: false, error: 'Recruitment application not found' },
      corsHeaders,
    );
  }
  if (!application.dgroup_approval_id) {
    return response(404, { success: false, error: 'Endorsement request not found' }, corsHeaders);
  }
  const { data: approval, error } = await supabase
    .from('approval_requests')
    .select('id, access_token, status')
    .eq('id', application.dgroup_approval_id)
    .maybeSingle();

  if (error || !approval || approval.status !== 'pending') {
    return response(409, { success: false, error: 'Endorsement is not pending' }, corsHeaders);
  }

  const { data: refreshedApproval, error: refreshError } = await supabase
    .from('approval_requests')
    .update({
      access_token: createApprovalAccessToken(),
      token_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      token_used_at: null,
    })
    .eq('id', approval.id)
    .eq('status', 'pending')
    .select('id, access_token')
    .maybeSingle();

  if (refreshError || !refreshedApproval) {
    return response(
      500,
      { success: false, error: 'Failed to refresh endorsement link' },
      corsHeaders,
    );
  }

  const emailResult = await enqueueApprovalReviewEmail(supabase, {
    assignedToEmail: dgroupInfoSchema.parse(application.dgroup_info).leader_email,
    subjectTitle: `Welcome Center Volunteer Endorsement - ${application.full_name}`,
    heading: 'DGroup Leader Endorsement Required',
    description: 'A member of your DGroup has applied to serve in the Welcome Center ministry.',
    details: [
      { label: 'Applicant', value: application.full_name },
      { label: 'Desired Role', value: application.desired_role },
    ],
    accessToken: refreshedApproval.access_token,
    approvalId: refreshedApproval.id,
  });

  return emailResult.success
    ? response(200, { success: true }, corsHeaders)
    : response(500, { success: false, error: 'Failed to resend endorsement email' }, corsHeaders);
}
