import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@welcomechurch.ph';

type RpcResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

type EmailQueuePayload = {
  event_type: string;
  recipient: string;
  template_slug?: string;
  subject?: string;
  text?: string;
  metadata?: Record<string, unknown>;
};

type EmailQueueMessage = {
  msg_id: number;
  message: EmailQueuePayload;
};

type EmailTemplate = {
  resend_template_id: string;
};

type EmailQueueClient = {
  rpc(
    functionName: 'pop_email_notifications',
    args: { batch_size: number },
  ): Promise<RpcResult<EmailQueueMessage[]>>;
  rpc(
    functionName: 'archive_email_notification',
    args: { message_id: number },
  ): Promise<RpcResult<boolean>>;
  from(table: 'email_templates'): {
    select(columns: 'resend_template_id'): {
      eq(
        column: 'slug',
        value: string,
      ): {
        single(): Promise<RpcResult<EmailTemplate>>;
      };
    };
  };
};

Deno.serve(async (req) => {
  const hookResult = await useEdgeHook({
    req,
    functionName: 'cron-process-email-queue',
    method: 'POST',
    requireAdmin: true,
    allowServiceRole: true,
    allowCronRole: true,
  });

  if (!hookResult.valid) {
    return hookResult.response;
  }

  const { client, corsHeaders, requestId } = hookResult;
  const queueClient = client as unknown as EmailQueueClient;

  if (!RESEND_API_KEY) {
    console.error('[cron-process-email-queue] RESEND_API_KEY is not configured');
    return errorResponse(
      corsHeaders,
      HTTP_STATUS.internalServerError,
      'Email provider not configured',
    );
  }

  try {
    // 1. Pop batch of messages from queue (using a wrapper RPC for pgmq.read)
    // The wrapper 'pop_email_notifications' should return up to 10 messages, locking them for 30 seconds.
    const { data: messages, error: popError } = await queueClient.rpc('pop_email_notifications', {
      batch_size: 10,
    });

    if (popError) {
      console.error('[cron-process-email-queue] Failed to pop messages', {
        requestId,
        error: popError,
      });
      return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Failed to read queue');
    }

    if (!messages || messages.length === 0) {
      return jsonResponse(corsHeaders, { success: true, processed: 0 }, HTTP_STATUS.ok);
    }

    let processedCount = 0;

    // 2. Process each message
    for (const msg of messages) {
      const payload = msg.message;
      const messageId = msg.msg_id;

      try {
        if (payload.event_type !== 'email_notification') {
          console.warn(
            `[cron-process-email-queue] Skipping unknown event_type: ${payload.event_type}`,
          );
          // Acknowledge invalid message to remove from queue
          await queueClient.rpc('archive_email_notification', { message_id: messageId });
          continue;
        }

        // 3. Resolve either a configured template or an explicit plain-text body.
        const resendBody: Record<string, unknown> = {
          from: RESEND_FROM_EMAIL,
          to: payload.recipient,
        };

        if (payload.template_slug) {
          const { data: template, error: templateError } = await queueClient
            .from('email_templates')
            .select('resend_template_id')
            .eq('slug', payload.template_slug)
            .single();

          if (templateError || !template) {
            console.error(
              `[cron-process-email-queue] Template not found for slug: ${payload.template_slug}`,
              { error: templateError },
            );
            // Leave it in the queue so a missing mapping can be corrected and retried.
            continue;
          }

          resendBody.template_id = template.resend_template_id;
          if (payload.metadata && typeof payload.metadata === 'object') {
            resendBody.variables = payload.metadata;
            resendBody.data = payload.metadata;
          }
        } else if (payload.text) {
          resendBody.subject = payload.subject || 'Email notification';
          resendBody.text = payload.text;
        } else {
          console.error(`[cron-process-email-queue] Invalid message ${messageId}: no email body`);
          await queueClient.rpc('archive_email_notification', { message_id: messageId });
          continue;
        }

        // 4. Send email via Resend API
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(resendBody),
        });

        if (!resendResponse.ok) {
          const errorBody = await resendResponse.text();
          console.error(
            `[cron-process-email-queue] Resend API error for msg ${messageId}:`,
            errorBody,
          );
          // Let it stay in queue to retry
          continue;
        }

        // 5. Acknowledge and archive the message
        await queueClient.rpc('archive_email_notification', { message_id: messageId });
        processedCount++;
      } catch (innerError) {
        console.error(
          `[cron-process-email-queue] Error processing message ${messageId}:`,
          innerError,
        );
        // Leave in queue for retry
      }
    }

    return jsonResponse(corsHeaders, { success: true, processed: processedCount }, HTTP_STATUS.ok);
  } catch (error) {
    console.error('[cron-process-email-queue] Unexpected error', { requestId, error });
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Internal server error');
  }
});
