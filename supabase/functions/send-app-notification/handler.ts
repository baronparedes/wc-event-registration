import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';
import { sendEmailNotifications } from './services/emailService.ts';
import { sendPushNotifications } from './services/pushService.ts';
import { payloadSchema } from './types.ts';

export async function handleSendAppNotification(req: Request): Promise<Response> {
  const hook = await useEdgeHook({
    req,
    functionName: 'send-app-notification',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin'],
    schema: payloadSchema,
  });

  if (!hook.valid) {
    return hook.response;
  }

  const { client: supabase, data: payload, userId, corsHeaders } = hook;

  try {
    const resolvedRoles =
      payload.targetRoles && payload.targetRoles.length > 0
        ? payload.targetRoles
        : payload.targetRole
          ? [payload.targetRole]
          : null;

    const channels = payload.channels ?? ['push'];
    const shouldSendPush = channels.includes('push');
    const shouldSendEmail = channels.includes('email');

    let notificationId: string | null = null;
    let pushRecipientCount = 0;
    let emailRecipientCount = 0;

    // 1. Send In-App & Web Push if push channel is selected
    if (shouldSendPush) {
      const pushResult = await sendPushNotifications({
        supabase,
        payload,
        resolvedRoles,
        userId,
      });
      notificationId = pushResult.notificationId;
      pushRecipientCount = pushResult.pushCount;
    }

    // 2. Send Emails if email channel is selected
    if (shouldSendEmail) {
      const emailResult = await sendEmailNotifications({
        supabase,
        payload,
        resolvedRoles,
      });
      emailRecipientCount = emailResult.emailCount;
    }

    const totalCount =
      shouldSendPush && shouldSendEmail
        ? Math.max(pushRecipientCount, emailRecipientCount)
        : shouldSendEmail
          ? emailRecipientCount
          : pushRecipientCount;

    return jsonResponse(corsHeaders, {
      success: true,
      count: totalCount,
      pushCount: pushRecipientCount,
      emailCount: emailRecipientCount,
      notificationId,
    });
  } catch (error) {
    console.error('[send-app-notification] unexpected error:', error);
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Internal server error');
  }
}
