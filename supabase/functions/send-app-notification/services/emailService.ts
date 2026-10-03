import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/database.types.ts';

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
    const ENQUEUE_CONCURRENCY = 10;
    for (let i = 0; i < targetEmails.length; i += ENQUEUE_CONCURRENCY) {
      const batch = targetEmails.slice(i, i + ENQUEUE_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (email) => {
          const { error: enqueueError } = await supabase.rpc('enqueue_email_notification', {
            payload: {
              event_type: 'email_notification',
              recipient: email,
              subject: payload.title,
              text: emailText,
            },
          });

          if (enqueueError) {
            console.error(
              `[send-app-notification] [email] Enqueue error for ${email}:`,
              enqueueError,
            );
            throw enqueueError;
          }

          return email;
        }),
      );

      successfulEnqueues += results.filter((r) => r.status === 'fulfilled').length;
    }

    console.log('[send-app-notification] [email] Broadcast queue summary:', {
      targetType: payload.targetType,
      title: payload.title,
      totalRecipients: targetEmails.length,
      enqueuedCount: successfulEnqueues,
    });

    if (successfulEnqueues > 0) {
      // 1. Trigger DB processor RPC (via pg_net in configured environments)
      const { error: triggerError } = await supabase.rpc('trigger_email_processor');
      if (triggerError) {
        console.warn('[send-app-notification] Error triggering email processor RPC:', triggerError);
      }

      // 2. Also invoke cron-process-email-queue directly from Edge runtime for instant delivery
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const cronRoleKey = Deno.env.get('CRON_ROLE_KEY');

        if (supabaseUrl && (serviceRoleKey || cronRoleKey)) {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (cronRoleKey) {
            headers['X-Cron-Key'] = cronRoleKey;
          } else if (serviceRoleKey) {
            headers['Authorization'] = `Bearer ${serviceRoleKey}`;
          }

          const triggerUrl = `${supabaseUrl}/functions/v1/cron-process-email-queue`;
          await fetch(triggerUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          }).catch((err) => {
            console.warn('[send-app-notification] Direct email processor trigger failed:', err);
          });
        }
      } catch (err) {
        console.warn('[send-app-notification] Failed to invoke cron-process-email-queue:', err);
      }
    }
  }

  return { emailCount: successfulEnqueues };
}
