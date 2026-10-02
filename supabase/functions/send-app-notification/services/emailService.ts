import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/database.types.ts';
import { isLocalBroadcastEnabled, logLocalBroadcast } from '@/shared/localBroadcast.ts';

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

  const emailCount = targetEmails.length;
  const emailText = payload.url ? `${payload.message}\n\n${payload.url}` : payload.message;

  if (targetEmails.length > 0) {
    for (const email of targetEmails) {
      const { error: enqueueError } = await supabase.rpc('enqueue_email_notification', {
        payload: {
          event_type: 'email_notification',
          recipient: email,
          subject: payload.title,
          text: emailText,
        },
      });
      if (enqueueError) {
        console.error(`Failed to enqueue email for ${email}:`, enqueueError);
      }

      if (isLocalBroadcastEnabled()) {
        await logLocalBroadcast({
          type: 'email',
          targetType: payload.targetType,
          targetEventId: payload.targetEventId,
          targetRoles: resolvedRoles,
          targetUserId: payload.targetUserId,
          recipient: email,
          subject: payload.title,
          body: emailText,
          url: payload.url,
        });
      }
    }

    const { error: triggerError } = await supabase.rpc('trigger_email_processor');
    if (triggerError) {
      console.warn('[send-app-notification] Error triggering email processor:', triggerError);
    }
  }

  return { emailCount };
}
