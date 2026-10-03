import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';

type PushSubscription = {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
};

type PushSender = (subscription: PushSubscription, payload: string) => Promise<void>;

type PushReminderMessage = {
  msg_id: number;
  read_ct: number;
  message: {
    user_id?: string;
    message?: string;
    target_date?: string;
    target_url?: string;
    url?: string;
  };
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  auth_key: string;
  p256dh_key: string;
};

const MAX_PUSH_DELIVERY_ATTEMPTS = 5;
const PUSH_QUEUE_BATCH_SIZE = 50;
const PUSH_MESSAGE_CONCURRENCY = 5;

export async function handleCronProcessPushReminders(
  req: Request,
  sendPushNotification: PushSender,
): Promise<Response> {
  const hookResult = await useEdgeHook({
    req,
    functionName: 'cron-process-push-reminders',
    method: 'POST',
    allowMissingOrigin: true,
    requireAdmin: true,
    allowServiceRole: true,
    allowCronRole: true,
  });

  if (!hookResult.valid) {
    return hookResult.response;
  }

  const { client, corsHeaders, requestId } = hookResult;
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('[cron-process-push-reminders] VAPID keys not configured');
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'VAPID keys not configured');
  }

  try {
    let totalProcessed = 0;
    const subscriptionsToDelete = new Set<string>();
    const statsByDate = new Map<string, { succeeded: number; failed: number }>();

    const recordStats = (targetDate: string | undefined, status: 'succeeded' | 'failed') => {
      if (!targetDate) return;
      const current = statsByDate.get(targetDate) ?? { succeeded: 0, failed: 0 };
      if (status === 'succeeded') current.succeeded += 1;
      else current.failed += 1;
      statsByDate.set(targetDate, current);
    };

    const archiveAfterRetryLimit = async (message: PushReminderMessage, error: unknown) => {
      if (message.read_ct < MAX_PUSH_DELIVERY_ATTEMPTS) {
        return;
      }

      console.error('[cron-process-push-reminders] Retry limit reached; archiving failed message', {
        messageId: message.msg_id,
        attempts: message.read_ct,
        error,
      });
      recordStats(message.message.target_date, 'failed');
      const { error: archiveError } = await client.rpc('archive_push_reminder', {
        message_id: message.msg_id,
      });
      if (archiveError) {
        console.error('[cron-process-push-reminders] Failed to archive exhausted message', {
          messageId: message.msg_id,
          error: archiveError,
        });
      }
    };

    while (true) {
      const { data: messages, error: popError } = await client.rpc('pop_push_reminders', {
        batch_size: PUSH_QUEUE_BATCH_SIZE,
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

      const pushMessages = messages as PushReminderMessage[];
      for (let offset = 0; offset < pushMessages.length; offset += PUSH_MESSAGE_CONCURRENCY) {
        const concurrentMessages = pushMessages.slice(offset, offset + PUSH_MESSAGE_CONCURRENCY);
        const processPromises = concurrentMessages.map(async (msg) => {
          const payload = msg.message;
          const messageId = msg.msg_id;
          const userId = payload.user_id;
          const notificationMessage = payload.message;

          if (!userId || !notificationMessage) {
            console.warn('[cron-process-push-reminders] Invalid payload structure', payload);
            recordStats(payload.target_date, 'failed');
            await client.rpc('archive_push_reminder', { message_id: messageId });
            return;
          }

          try {
            const { data: subscriptions, error: subError } = await client
              .from('user_push_subscriptions')
              .select('id, endpoint, auth_key, p256dh_key')
              .eq('user_id', userId)
              .returns<PushSubscriptionRow[]>();

            if (subError) {
              console.error(
                `[cron-process-push-reminders] Failed to fetch sub for user ${userId}`,
                subError,
              );
              await archiveAfterRetryLimit(msg, subError);
              return;
            }

            if (!vapidPublicKey || !vapidPrivateKey) {
              console.log('[cron-process-push-reminders] [LOCAL/SIMULATION] Push notification:', {
                recipient: userId,
                title: 'Service Reminder',
                message: notificationMessage,
              });
              recordStats(payload.target_date, 'succeeded');
              await client.rpc('archive_push_reminder', { message_id: messageId });
              totalProcessed++;
              return;
            }

            if (subscriptions && subscriptions.length > 0) {
              const pushPayload = JSON.stringify({
                title: 'Service Reminder',
                body: notificationMessage,
                url: payload.target_url || payload.url || '/profile?tab=commitments',
              });

              let deliveryFailed = false;
              for (const sub of subscriptions) {
                const pushSubscription = {
                  endpoint: sub.endpoint,
                  keys: {
                    auth: sub.auth_key,
                    p256dh: sub.p256dh_key,
                  },
                };
                try {
                  await sendPushNotification(pushSubscription, pushPayload);
                } catch (err: unknown) {
                  const pushError = err as { statusCode?: number };
                  if (pushError.statusCode === 404 || pushError.statusCode === 410) {
                    subscriptionsToDelete.add(sub.id);
                  } else {
                    deliveryFailed = true;
                    console.error(`Failed to push to sub ${sub.id}:`, err);
                  }
                }
              }

              if (deliveryFailed) {
                if (msg.read_ct >= MAX_PUSH_DELIVERY_ATTEMPTS) {
                  await archiveAfterRetryLimit(msg, 'push delivery failed');
                }
                return;
              }
            }

            recordStats(payload.target_date, 'succeeded');
            await client.rpc('archive_push_reminder', { message_id: messageId });
          } catch (innerError) {
            console.error(
              `[cron-process-push-reminders] Error processing message ${messageId}:`,
              innerError,
            );
            await archiveAfterRetryLimit(msg, innerError);
          }
        });

        await Promise.allSettled(processPromises);
      }
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

    for (const [sundayDate, stats] of statsByDate.entries()) {
      try {
        await (
          client as unknown as {
            rpc: (name: string, params: Record<string, unknown>) => Promise<{ error: unknown }>;
          }
        ).rpc('update_push_reminder_delivery_stats', {
          p_sunday_date: sundayDate,
          p_succeeded_count: stats.succeeded,
          p_failed_count: stats.failed,
        });
      } catch (statError) {
        console.warn('[cron-process-push-reminders] Failed to update delivery stats', {
          sundayDate,
          stats,
          statError,
        });
      }
    }

    return jsonResponse(corsHeaders, { success: true, processed: totalProcessed }, HTTP_STATUS.ok);
  } catch (error) {
    console.error('[cron-process-push-reminders] Unexpected error', { requestId, error });
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Internal server error');
  }
}
