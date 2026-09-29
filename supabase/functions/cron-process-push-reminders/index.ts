import webpush from 'npm:web-push';

import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const subject = 'mailto:admin@welcomehub.app';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey);
}

Deno.serve(async (req) => {
  const hookResult = await useEdgeHook({
    req,
    functionName: 'cron-process-push-reminders',
    method: 'POST',
    requireAdmin: true,
    allowServiceRole: true,
    allowCronRole: true,
  });

  if (!hookResult.valid) {
    return hookResult.response;
  }

  const { client, corsHeaders, requestId } = hookResult;

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('[cron-process-push-reminders] VAPID keys not configured');
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'VAPID keys not configured');
  }

  try {
    // 1. Generate reminders for upcoming Sunday if not already generated
    const { error: genError } = await client.rpc('generate_upcoming_sunday_push_reminders');
    if (genError) {
      console.error('[cron-process-push-reminders] Failed to generate upcoming Sunday reminders', {
        requestId,
        error: genError,
      });
    }

    // 2. Process all pending queue messages in batches
    let totalProcessed = 0;
    const subscriptionsToDelete = new Set<string>();

    while (true) {
      const { data: messages, error: popError } = await client.rpc('pop_push_reminders', {
        batch_size: 50,
      });

      if (popError) {
        console.error('[cron-process-push-reminders] Failed to pop messages', {
          requestId,
          error: popError,
        });
        return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Failed to read queue');
      }

      if (!messages || messages.length === 0) {
        break;
      }

      const processPromises = messages.map(async (msg) => {
        const payload = msg.message;
        const messageId = msg.msg_id;
        const userId = payload.user_id;
        const notificationMessage = payload.message;

        if (!userId || !notificationMessage) {
          console.warn(`[cron-process-push-reminders] Invalid payload structure`, payload);
          await client.rpc('archive_push_reminder', { message_id: messageId });
          return;
        }

        try {
          const { data: subscriptions, error: subError } = await client
            .from('user_push_subscriptions')
            .select('id, endpoint, auth_key, p256dh_key')
            .eq('user_id', userId);

          if (subError) {
            console.error(
              `[cron-process-push-reminders] Failed to fetch sub for user ${userId}`,
              subError,
            );
            return;
          }

          if (subscriptions && subscriptions.length > 0) {
            const pushPayload = JSON.stringify({
              title: 'Service Reminder',
              body: notificationMessage,
              url: payload.target_url || payload.url || '/profile?tab=commitments',
            });

            const pushPromises = subscriptions.map((sub) => {
              const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                  auth: sub.auth_key,
                  p256dh: sub.p256dh_key,
                },
              };
              return webpush.sendNotification(pushSubscription, pushPayload).catch((err) => {
                if (err.statusCode === 404 || err.statusCode === 410) {
                  subscriptionsToDelete.add(sub.id);
                } else {
                  console.error(`Failed to push to sub ${sub.id}:`, err);
                }
              });
            });

            await Promise.allSettled(pushPromises);
          }

          await client.rpc('archive_push_reminder', { message_id: messageId });
        } catch (innerError) {
          console.error(
            `[cron-process-push-reminders] Error processing message ${messageId}:`,
            innerError,
          );
        }
      });

      await Promise.allSettled(processPromises);
      totalProcessed += messages.length;
    }

    if (subscriptionsToDelete.size > 0) {
      const { error: deleteError } = await client
        .from('user_push_subscriptions')
        .delete()
        .in('id', Array.from(subscriptionsToDelete));

      if (deleteError) {
        console.error(
          '[cron-process-push-reminders] Failed to delete stale subscriptions',
          deleteError,
        );
      }
    }

    return jsonResponse(corsHeaders, { success: true, processed: totalProcessed }, HTTP_STATUS.ok);
  } catch (error) {
    console.error('[cron-process-push-reminders] Unexpected error', { requestId, error });
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Internal server error');
  }
});
