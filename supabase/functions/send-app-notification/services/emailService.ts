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

  return { emailCount };
}
