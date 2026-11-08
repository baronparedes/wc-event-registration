import { RATE_LIMIT_PRESETS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { response, reviewerRoles } from './actions/helpers.ts';
import { actionRoutes } from './actions/index.ts';
import { updateRecruitmentStageSchema } from './schemas.ts';

export { updateRecruitmentStageSchema };

export async function handleUpdateRecruitmentStage(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'update-recruitment-stage',
    method: 'POST',
    requireAuth: true,
    schema: updateRecruitmentStageSchema,
    publicRateLimit: {
      scope: 'update-recruitment-stage',
      windowMs: RATE_LIMIT_PRESETS.submitRegistration.windowMs,
      maxHits: RATE_LIMIT_PRESETS.submitRegistration.maxHits,
    },
  });

  if (!guard.valid) return guard.response;

  const { action, application_id: applicationId } = guard.data;
  const supabase = guard.client;
  const userId = guard.userId;
  if (!userId) {
    return response(401, { success: false, error: 'Unauthorized' }, guard.corsHeaders);
  }
  const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(userId);
  if (authUserError || !authUser.user?.email) {
    return response(
      401,
      { success: false, error: 'Unable to verify applicant identity' },
      guard.corsHeaders,
    );
  }
  const normalizedEmail = authUser.user.email.toLowerCase();

  const { data: adminRecord } = await supabase
    .from('admins')
    .select('role')
    .eq('auth_user_id', userId)
    .maybeSingle();
  const adminRole = adminRecord?.role ?? null;
  const isReviewer = adminRole !== null && reviewerRoles.has(adminRole);
  const isApplicantSelfService = action === 'complete_vmt' || action === 'save_commitments';

  const { data: application, error: applicationError } = await supabase
    .from('recruitment_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    return response(
      404,
      { success: false, error: 'Recruitment application not found' },
      guard.corsHeaders,
    );
  }

  if (
    (!isReviewer || isApplicantSelfService) &&
    application.auth_user_id !== userId &&
    application.email.toLowerCase() !== normalizedEmail
  ) {
    return response(
      404,
      { success: false, error: 'Recruitment application not found' },
      guard.corsHeaders,
    );
  }

  if (!isReviewer && application.auth_user_id === null && action !== 'complete_vmt') {
    const { error } = await supabase
      .from('recruitment_applications')
      .update({ auth_user_id: userId })
      .eq('id', application.id);
    if (error) {
      return response(
        500,
        { success: false, error: 'Failed to link applicant account' },
        guard.corsHeaders,
      );
    }
    application.auth_user_id = userId;
  }

  const route = actionRoutes[action];
  if (!route) {
    return response(400, { success: false, error: 'Invalid action' }, guard.corsHeaders);
  }

  if (route.requiresReviewer && !isReviewer) {
    return response(403, { success: false, error: 'Reviewer access required' }, guard.corsHeaders);
  }

  return route.handle({
    supabase,
    request: guard.data,
    application,
    authUser: authUser.user,
    userId,
    normalizedEmail,
    adminRole,
    isReviewer,
    corsHeaders: guard.corsHeaders,
  });
}
