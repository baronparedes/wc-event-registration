import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/database.types.ts';
import {
  type EnqueueEmailInput,
  enqueueEmailNotificationsBatch,
  triggerEmailProcessor,
} from '@/shared/emailQueue.ts';
import {
  escapeHtml,
  linkifyEscapedText,
  resolveActionText,
  toAbsoluteUrl,
} from '@/shared/emailTemplate.ts';

import { resolveTargetEmails } from '../targets/index.ts';
import type { SendAppNotificationPayload } from '../types.ts';

export interface SendEmailNotificationsParams {
  supabase: SupabaseClient<Database>;
  payload: SendAppNotificationPayload;
  resolvedRoles?: string[] | null;
}

export interface SendEmailNotificationsResult {
  emailCount: number;
}

export async function sendEmailNotifications({
  supabase,
  payload,
  resolvedRoles,
}: SendEmailNotificationsParams): Promise<SendEmailNotificationsResult> {
  const targetEmails = await resolveTargetEmails({
    supabase,
    targetType: payload.targetType,
    targetRoles: resolvedRoles,
    targetUserId: payload.targetUserId,
    targetEventId: payload.targetEventId,
  });

  const absoluteUrl = payload.url ? toAbsoluteUrl(payload.url) : undefined;
  const emailText = absoluteUrl ? `${payload.message}\n\n${absoluteUrl}` : payload.message;
  const actionUrl = (absoluteUrl || payload.url) ?? 'https://welcomehub.app';
  const actionText = resolveActionText(actionUrl);
  const escapedMessage = escapeHtml(payload.message || '');
  const messageHtml = linkifyEscapedText(escapedMessage).replace(/\r?\n/g, '<br />');
  let successfulEnqueues = 0;

  if (targetEmails.length > 0) {
    const queueInputs: EnqueueEmailInput[] = targetEmails.map((email) => ({
      recipient: email,
      category: 'broadcast',
      event_type: 'email_notification',
      template_slug: 'broadcast',
      subject: payload.title,
      text: emailText,
      metadata: {
        broadcast_title: payload.title,
        title: payload.title,
        broadcast_message: payload.message,
        message: payload.message,
        broadcast_message_html: messageHtml,
        message_html: messageHtml,
        url: actionUrl,
        action_url: actionUrl,
        action_text: actionText,
        target_type: payload.targetType,
      },
    }));

    const batchResult = await enqueueEmailNotificationsBatch(supabase, queueInputs, {
      concurrency: 10,
    });
    successfulEnqueues = batchResult.successfulCount;

    console.log('[send-app-notification] [email] Broadcast queue summary:', {
      targetType: payload.targetType,
      title: payload.title,
      totalRecipients: targetEmails.length,
      enqueuedCount: successfulEnqueues,
    });

    if (successfulEnqueues > 0) {
      await triggerEmailProcessor(supabase);
    }
  }

  return { emailCount: successfulEnqueues };
}
