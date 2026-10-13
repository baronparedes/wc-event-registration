import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';
import { processDirectMessage } from './directDispatcher.ts';
import { processMessagesWithOutlookBatch } from './outlookBatchDispatcher.ts';
import { EmailDeliveryTracker } from './tracker.ts';
import { EMAIL_QUEUE_BATCH_SIZE, EMAIL_SEND_CONCURRENCY, type EmailQueueClient } from './types.ts';

export { resolveNotificationCategory } from './categories.ts';
export type { NotificationCategory } from './types.ts';

export async function handleCronProcessEmailQueue(req: Request): Promise<Response> {
  const hookResult = await useEdgeHook({
    req,
    functionName: 'cron-process-email-queue',
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
  const queueClient = client as unknown as EmailQueueClient;
  const outlookDispatchEmail = Deno.env.get('OUTLOOK_DISPATCH_EMAIL')?.trim();

  try {
    const tracker = new EmailDeliveryTracker();

    while (true) {
      const { data: messages, error: popError } = await queueClient.rpc('pop_email_notifications', {
        batch_size: EMAIL_QUEUE_BATCH_SIZE,
      });

      if (popError) {
        console.error('[cron-process-email-queue] Failed to pop messages', {
          requestId,
          error: popError,
        });
        return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Failed to read queue');
      }

      if (!messages || messages.length === 0) {
        break;
      }

      if (outlookDispatchEmail) {
        await processMessagesWithOutlookBatch(queueClient, messages, outlookDispatchEmail, tracker);
      } else {
        for (let offset = 0; offset < messages.length; offset += EMAIL_SEND_CONCURRENCY) {
          const concurrentMessages = messages.slice(offset, offset + EMAIL_SEND_CONCURRENCY);
          await Promise.allSettled(
            concurrentMessages.map((msg) => processDirectMessage(queueClient, msg, tracker)),
          );
        }
      }
    }

    await tracker.flush(queueClient);

    if (tracker.processedCount > 0) {
      console.log('[cron-process-email-queue] Completed email batch processing:', {
        processedCount: tracker.processedCount,
      });
    }

    return jsonResponse(
      corsHeaders,
      { success: true, processed: tracker.processedCount },
      HTTP_STATUS.ok,
    );
  } catch (error) {
    console.error('[cron-process-email-queue] Unexpected error', { requestId, error });
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Internal server error');
  }
}
