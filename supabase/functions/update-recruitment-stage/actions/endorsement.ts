import { enqueueApprovalReviewEmail } from '@/shared/approvals.ts';

import { dgroupInfoSchema } from '../schemas.ts';
import type { RecruitmentActionContext } from '../types.ts';
import { createApprovalAccessToken, response } from './helpers.ts';

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
