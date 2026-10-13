import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import {
  type SupabaseRpcClient,
  enqueueEmailNotification,
  triggerEmailProcessor,
} from '../_shared/emailQueue.ts';
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
  const enqueueClient = client as unknown as SupabaseRpcClient;

  try {
    const { messageId, error: queueError } = await enqueueEmailNotification(enqueueClient, {
      event_type: data.event_type,
      recipient: data.recipient,
      template_slug: data.template_slug,
      subject: data.subject,
      text: data.text,
      metadata: data.metadata,
      idempotency_key: data.idempotency_key,
    });

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

    // Trigger processing via database helper (directEdgeInvoke false to preserve fire-and-forget RPC behavior)
    await triggerEmailProcessor(enqueueClient, { directEdgeInvoke: false });

    return jsonResponse(corsHeaders, { success: true, message_id: messageId }, HTTP_STATUS.created);
  } catch (error) {
    console.error('[enqueue-event] Unexpected error', {
      requestId,
      error,
    });
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Internal server error');
  }
}
