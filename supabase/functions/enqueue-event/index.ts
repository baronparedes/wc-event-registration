import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { createJsonResponse, errorResponse } from '../_shared/http.ts';
import { z } from '../_shared/validation.ts';

const enqueueEventSchema = z.object({
  event_type: z.string().min(1),
  recipient: z.string().min(1),
  template_slug: z.string().min(1),
  metadata: z.record(z.any()),
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

    // Use Postgres RPC to enqueue the message to pgmq
    // The pgmq extension provides pgmq.send('queue_name', jsonb)
    // We can call it directly using raw postgres rpc, or a wrapper.
    // Since we didn't expose a specific wrapper, we can query it via rpc if exposed,
    // or insert directly if we have a wrapper. Let's use the standard supabase approach:
    // Calling pgmq.send is typically done via a wrapper function if not exposed to postgrest.
    // Let's create a small RPC in the database migration to safely wrap pgmq.send since pgmq is in a different schema.

    // Instead of doing raw SQL from edge function (which requires a direct DB connection, not postgrest),
    // we need an RPC wrapper. Let me update the migration first. Let's assume we have `public.enqueue_email_notification`
    const { data: queueResult, error: queueError } = await client.rpc(
      'enqueue_email_notification',
      {
        payload: payload,
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

    // Attempt to trigger immediate processing (fire-and-forget)
    await client.rpc('trigger_email_processor').catch((err) => {
      console.warn('[enqueue-event] Non-fatal error triggering email processor immediately:', err);
    });

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
