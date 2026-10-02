import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';
import { isLocalBroadcastEnabled, logLocalBroadcast } from '../_shared/localBroadcast.ts';

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
  read_ct: number;
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

const MAX_EMAIL_DELIVERY_ATTEMPTS = 5;
const EMAIL_QUEUE_BATCH_SIZE = 50;
const EMAIL_SEND_CONCURRENCY = 5;

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
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@welcomechurch.ph';
  const isLocalBroadcast = isLocalBroadcastEnabled();

  if (!resendApiKey && !isLocalBroadcast) {
    console.error('[cron-process-email-queue] RESEND_API_KEY is not configured');
    return errorResponse(
      corsHeaders,
      HTTP_STATUS.internalServerError,
      'Email provider not configured',
    );
  }

  try {
    let processedCount = 0;
    const archiveAfterRetryLimit = async (message: EmailQueueMessage, error: unknown) => {
      if (message.read_ct < MAX_EMAIL_DELIVERY_ATTEMPTS) {
        return;
      }

      console.error('[cron-process-email-queue] Retry limit reached; archiving failed message', {
        messageId: message.msg_id,
        attempts: message.read_ct,
        error,
      });
      const { error: archiveError } = await queueClient.rpc('archive_email_notification', {
        message_id: message.msg_id,
      });
      if (archiveError) {
        console.error('[cron-process-email-queue] Failed to archive exhausted message', {
          messageId: message.msg_id,
          error: archiveError,
        });
      }
    };

    const processMessage = async (msg: EmailQueueMessage) => {
      const payload = msg.message;
      const messageId = msg.msg_id;

      try {
        if (payload.event_type !== 'email_notification') {
          console.warn(
            `[cron-process-email-queue] Skipping unknown event_type: ${payload.event_type}`,
          );
          await queueClient.rpc('archive_email_notification', { message_id: messageId });
          return;
        }

        // Local simulation when no real Resend key is available
        if (isLocalBroadcast && !resendApiKey) {
          await logLocalBroadcast({
            type: 'email',
            targetType: 'email_queue',
            recipient: payload.recipient,
            subject: payload.subject || 'Email notification',
            body: payload.text || JSON.stringify(payload.metadata || {}),
          });
          await queueClient.rpc('archive_email_notification', { message_id: messageId });
          processedCount++;
          return;
        }

        const resendBody: Record<string, unknown> = {
          from: resendFromEmail,
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
            await archiveAfterRetryLimit(msg, templateError ?? 'template not found');
            return;
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
          return;
        }

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify(resendBody),
        });

        if (!resendResponse.ok) {
          const errorBody = await resendResponse.text();
          console.error(
            `[cron-process-email-queue] Resend API error for msg ${messageId}:`,
            errorBody,
          );
          await archiveAfterRetryLimit(msg, errorBody);
          return;
        }

        await queueClient.rpc('archive_email_notification', { message_id: messageId });
        processedCount++;
      } catch (innerError) {
        console.error(
          `[cron-process-email-queue] Error processing message ${messageId}:`,
          innerError,
        );
        await archiveAfterRetryLimit(msg, innerError);
      }
    };

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

      for (let offset = 0; offset < messages.length; offset += EMAIL_SEND_CONCURRENCY) {
        const concurrentMessages = messages.slice(offset, offset + EMAIL_SEND_CONCURRENCY);
        await Promise.allSettled(concurrentMessages.map(processMessage));
      }
    }

    return jsonResponse(corsHeaders, { success: true, processed: processedCount }, HTTP_STATUS.ok);
  } catch (error) {
    console.error('[cron-process-email-queue] Unexpected error', { requestId, error });
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Internal server error');
  }
}
