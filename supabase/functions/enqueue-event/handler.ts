import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';
import { z } from '../_shared/validation.ts';

const enqueueEventSchema = z
  .object({
    event_type: z.string().min(1),
    recipient: z.string().min(1),
    template_slug: z.string().min(1).optional(),
    subject: z.string().min(1).max(255).optional(),
    text: z.string().min(1).max(100_000).optional(),
    metadata: z.record(z.unknown()),
    idempotency_key: z.string().optional(),
  })
  .refine((payload) => payload.template_slug || payload.text, {
    message: 'Either template_slug or text is required',
  });

type RpcResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

type EnqueueEventClient = {
  rpc(
    functionName: 'enqueue_email_notification',
    args: { payload: Record<string, unknown> },
  ): Promise<RpcResult<number>>;
  rpc(functionName: 'trigger_email_processor'): Promise<RpcResult<null>>;
};

export async function handleEnqueueEvent(req: Request): Promise<Response> {
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
  const enqueueClient = client as unknown as EnqueueEventClient;

  try {
    // Construct the payload for the queue
    const payload = {
      event_type: data.event_type,
      recipient: data.recipient,
      template_slug: data.template_slug,
      subject: data.subject,
      text: data.text,
      metadata: data.metadata,
      idempotency_key: data.idempotency_key,
    };

    const { data: queueResult, error: queueError } = await enqueueClient.rpc(
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
    const { error: triggerError } = await enqueueClient.rpc('trigger_email_processor');
    if (triggerError) {
      console.warn(
        '[enqueue-event] Non-fatal error triggering email processor immediately:',
        triggerError,
      );
    }

    return jsonResponse(
      corsHeaders,
      { success: true, message_id: queueResult },
      HTTP_STATUS.created,
    );
  } catch (error) {
    console.error('[enqueue-event] Unexpected error', {
      requestId,
      error,
    });
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Internal server error');
  }
}
