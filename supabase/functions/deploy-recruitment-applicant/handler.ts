import { RATE_LIMIT_PRESETS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { enqueueEmailNotification, triggerEmailProcessor } from '../_shared/emailQueue.ts';
import { z } from '../_shared/validation.ts';

const deployRecruitmentApplicantSchema = z.object({
  application_id: z.string().uuid(),
});

const deploymentResultSchema = z.object({
  success: z.literal(true),
  application_id: z.string().uuid(),
  user_id: z.string().uuid(),
  member_id: z.string().min(1),
  already_deployed: z.boolean(),
});

function response(
  status: number,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleDeployRecruitmentApplicant(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'deploy-recruitment-applicant',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin', 'slod'],
    rateLimit: {
      scope: 'deploy-recruitment-applicant',
      windowMs: RATE_LIMIT_PRESETS.createMember.windowMs,
      maxHits: RATE_LIMIT_PRESETS.createMember.maxHits,
    },
    schema: deployRecruitmentApplicantSchema,
  });

  if (!guard.valid) return guard.response;

  const { application_id: applicationId } = guard.data;
  const supabase = guard.client;
  const { data: application, error: applicationError } = await supabase
    .from('recruitment_applications')
    .select('id, full_name, email, desired_role, confirmed_role, auth_user_id')
    .eq('id', applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    return response(
      404,
      { success: false, error: 'Recruitment application not found' },
      guard.corsHeaders,
    );
  }

  const { data: deploymentData, error: deploymentError } = await supabase.rpc(
    'deploy_recruitment_applicant',
    { p_application_id: applicationId },
  );
  const deployment = deploymentResultSchema.safeParse(deploymentData);
  if (deploymentError || !deployment.success) {
    console.error('Recruitment deployment failed:', deploymentError);
    return response(
      409,
      {
        success: false,
        error: deploymentError?.message || 'Applicant is not ready for deployment',
        error_code: 'DEPLOYMENT_FAILED',
      },
      guard.corsHeaders,
    );
  }

  if (deployment.data.already_deployed) {
    return response(
      200,
      {
        success: true,
        application_id: applicationId,
        user_id: deployment.data.user_id,
        member_id: deployment.data.member_id,
        already_deployed: true,
        notifications_sent: false,
      },
      guard.corsHeaders,
    );
  }

  let notificationsSent = true;
  const message = `You have been deployed as a ${application.confirmed_role ?? application.desired_role}. Your member ID is ${deployment.data.member_id}.`;
  const { error: emailError } = await enqueueEmailNotification(supabase, {
    recipient: application.email,
    category: 'approval',
    event_type: 'email_notification',
    template_slug: 'recruitment-deployment',
    subject: 'Welcome to the Welcome Center team',
    text: `Welcome, ${application.full_name}. ${message}`,
    metadata: {
      target_type: 'recruitment-deployment',
      application_id: application.id,
      member_id: deployment.data.member_id,
    },
  });
  if (emailError) {
    notificationsSent = false;
    console.error('Failed to queue recruitment deployment email:', emailError);
  } else {
    await triggerEmailProcessor(supabase);
  }

  if (application.auth_user_id) {
    const { data: notification, error: notificationError } = await supabase
      .from('app_notifications')
      .insert({
        title: 'Welcome to the Welcome Center team',
        message,
        target_type: 'user',
        created_by: guard.userId,
      })
      .select('id')
      .single();

    if (!notificationError && notification) {
      const { error: recipientError } = await supabase.from('app_notification_recipients').insert({
        notification_id: notification.id,
        user_id: application.auth_user_id,
      });
      if (recipientError) {
        notificationsSent = false;
        console.error('Failed to create deployment notification recipient:', recipientError);
      }
    } else {
      notificationsSent = false;
      console.error('Failed to create recruitment deployment notification:', notificationError);
    }
  }

  return response(
    200,
    {
      success: true,
      application_id: applicationId,
      user_id: deployment.data.user_id,
      member_id: deployment.data.member_id,
      already_deployed: deployment.data.already_deployed,
      notifications_sent: notificationsSent,
    },
    guard.corsHeaders,
  );
}
