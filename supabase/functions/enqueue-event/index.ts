import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { createJsonResponse, errorResponse } from '../_shared/http.ts';
import { z } from '../_shared/validation.ts';

const enqueueEventSchema = z.object({
  event_type: z.string().min(1),
  recipient: z.string().min(1),
  template_slug: z.string().min(1),
  metadata: z.record(z.unknown()),
  idempotency_key: z.string().optional(),
});

Deno.serve(async (req) => {
  const hookResult = await useEdgeHook({
    req,
    functionName: 'enqueue-event',
    method: 'POST',
    requireAdmin: true,
    allowServiceRole: true, // Allow server-to-server calls
    schema: enqueueEventSchema,
  });

  if (!hookResult.valid) {
    return hookResult.response;
  }

  const { client, data, corsHeaders, requestId } = hookResult;

  try {
    // Construct the payload for the queue
    const payload = {
      event_type: data.event_type,
      recipient: data.recipient,
      template_slug: data.template_slug,
      metadata: data.metadata,
      idempotency_key: data.idempotency_key,
    };

    const { data: queueResult, error: queueError } = await client.rpc(
      'enqueue_email_notification',
      {
        payload,
      },
    );

    if (queueError) {
      console.error('[enqueue-event] Failed to enqueue message', {
        requestId,
        error: queueError,
      });
      return errorResponse(
        corsHeaders,
        HTTP_STATUS.internalServerError,
        'Failed to enqueue message',
      );
    }

    // Attempt to trigger immediate processing (fire-and-forget via pg_net helper)
    const { error: triggerError } = await client.rpc('trigger_email_processor');
    if (triggerError) {
      console.warn(
        '[enqueue-event] Non-fatal error triggering email processor immediately:',
        triggerError,
      );
    }

    return createJsonResponse(
      { success: true, message_id: queueResult },
      HTTP_STATUS.created,
      corsHeaders,
    );
  } catch (error) {
    console.error('[enqueue-event] Unexpected error', {
      requestId,
      error,
    });
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Internal server error');
  }
});
