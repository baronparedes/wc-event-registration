import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/database.types.ts';
import {
  type EnqueueEmailInput,
  enqueueEmailNotificationsBatch,
  triggerEmailProcessor,
} from '@/shared/emailQueue.ts';

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

  const emailText = payload.url ? `${payload.message}\n\n${payload.url}` : payload.message;
  let successfulEnqueues = 0;

  if (targetEmails.length > 0) {
    const queueInputs: EnqueueEmailInput[] = targetEmails.map((email) => ({
      recipient: email,
      category: 'broadcast',
      event_type: 'email_notification',
      subject: payload.title,
      text: emailText,
      metadata: {
        broadcast_title: payload.title,
        broadcast_message: payload.message,
        url: payload.url,
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
