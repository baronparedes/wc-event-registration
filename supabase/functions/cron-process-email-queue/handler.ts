import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import {
  type PowerAutomateBatchItem,
  type PowerAutomateBatchPayload,
  encodeBase64Utf8,
  fetchResendTemplate,
  tokenizeTemplate,
  wrapPlainTextAsHtml,
} from '../_shared/emailTemplate.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';
import { sendResendEmail } from '../_shared/resend.ts';

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
  rpc(
    functionName: 'update_email_reminder_delivery_stats',
    args: { p_sunday_date: string; p_succeeded_count: number; p_failed_count: number },
  ): Promise<RpcResult<void>>;
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
  const outlookDispatchEmail = Deno.env.get('OUTLOOK_DISPATCH_EMAIL')?.trim();

  try {
    let processedCount = 0;
    const statsByDate = new Map<string, { succeeded: number; failed: number }>();

    const recordEmailStats = (sundayDate: unknown, status: 'succeeded' | 'failed') => {
      if (typeof sundayDate !== 'string' || !sundayDate) return;
      const current = statsByDate.get(sundayDate) ?? { succeeded: 0, failed: 0 };
      if (status === 'succeeded') current.succeeded += 1;
      else current.failed += 1;
      statsByDate.set(sundayDate, current);
    };

    const archiveAfterRetryLimit = async (message: EmailQueueMessage, error: unknown) => {
      if (message.read_ct < MAX_EMAIL_DELIVERY_ATTEMPTS) {
        return;
      }

      console.error('[cron-process-email-queue] Retry limit reached; archiving failed message', {
        messageId: message.msg_id,
        attempts: message.read_ct,
        error,
      });
      recordEmailStats(message.message.metadata?.sunday_date, 'failed');
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
      const sundayDate = payload.metadata?.sunday_date;

      try {
        if (payload.event_type !== 'email_notification') {
          console.warn(
            `[cron-process-email-queue] Skipping unknown event_type: ${payload.event_type}`,
          );
          await queueClient.rpc('archive_email_notification', { message_id: messageId });
          return;
        }

        let templateId: string | undefined;
        const emailText = payload.text;
        let emailSubject = payload.subject;

        if (payload.template_slug) {
          const { data: template, error: templateError } = await queueClient
            .from('email_templates')
            .select('resend_template_id')
            .eq('slug', payload.template_slug)
            .single();

          if (template && !templateError) {
            templateId = template.resend_template_id;
          } else if (payload.text) {
            console.warn(
              `[cron-process-email-queue] Template not found for slug ${payload.template_slug}; falling back to plain text email`,
            );
            emailSubject = payload.subject || 'Service Reminder';
          } else {
            console.error(
              `[cron-process-email-queue] Template not found for slug: ${payload.template_slug}`,
              { error: templateError },
            );
            await archiveAfterRetryLimit(msg, templateError ?? 'template not found');
            return;
          }
        } else if (!emailText) {
          console.error(`[cron-process-email-queue] Invalid message ${messageId}: no email body`);
          recordEmailStats(sundayDate, 'failed');
          await queueClient.rpc('archive_email_notification', { message_id: messageId });
          return;
        }

        const isSundayReminder = typeof sundayDate === 'string' && sundayDate.length > 0;
        const sendResult = await sendResendEmail({
          to: payload.recipient,
          subject: emailSubject,
          text: emailText,
          template_id: templateId,
          variables: payload.metadata,
          data: payload.metadata,
          metadata: payload.metadata,
          targetType: isSundayReminder ? 'sunday-schedule-reminder' : 'broadcast-notification',
        });

        if (!sendResult.ok) {
          console.error(
            `[cron-process-email-queue] Resend delivery failed for msg ${messageId}:`,
            sendResult.error,
          );
          await archiveAfterRetryLimit(msg, sendResult.error);
          return;
        }

        recordEmailStats(sundayDate, 'succeeded');
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

    const processMessagesWithOutlookBatch = async (
      messages: EmailQueueMessage[],
      targetDispatchEmail: string,
    ) => {
      const validItems: PowerAutomateBatchItem[] = [];
      const validMessages: EmailQueueMessage[] = [];

      for (const msg of messages) {
        const payload = msg.message;
        const messageId = msg.msg_id;
        const sundayDate = payload.metadata?.sunday_date;

        if (payload.event_type !== 'email_notification') {
          console.warn(
            `[cron-process-email-queue] Skipping unknown event_type: ${payload.event_type}`,
          );
          await queueClient.rpc('archive_email_notification', { message_id: messageId });
          continue;
        }

        let bodyHtml: string | undefined;
        let emailSubject: string;

        if (payload.template_slug) {
          const { data: template, error: templateError } = await queueClient
            .from('email_templates')
            .select('resend_template_id')
            .eq('slug', payload.template_slug)
            .single();

          if (template && !templateError) {
            const resendTemplate = await fetchResendTemplate(template.resend_template_id);
            if (resendTemplate?.html) {
              bodyHtml = tokenizeTemplate(resendTemplate.html, payload.metadata);
              emailSubject =
                payload.subject ||
                (resendTemplate.subject
                  ? tokenizeTemplate(resendTemplate.subject, payload.metadata)
                  : 'Service Reminder');
            } else if (payload.text) {
              console.warn(
                `[cron-process-email-queue] Resend template '${template.resend_template_id}' returned no HTML (or fetch failed); falling back to wrapped plain text for msg ${messageId}`,
              );
              bodyHtml = wrapPlainTextAsHtml(payload.text, payload.subject);
              emailSubject = payload.subject || 'Service Reminder';
            } else {
              console.error(
                `[cron-process-email-queue] Failed to fetch Resend template: ${template.resend_template_id}`,
              );
              await archiveAfterRetryLimit(msg, 'Failed to fetch Resend template');
              continue;
            }
          } else if (payload.text) {
            console.warn(
              `[cron-process-email-queue] Template not found for slug ${payload.template_slug}; falling back to plain text email`,
            );
            bodyHtml = wrapPlainTextAsHtml(payload.text, payload.subject);
            emailSubject = payload.subject || 'Service Reminder';
          } else {
            console.error(
              `[cron-process-email-queue] Template not found for slug: ${payload.template_slug}`,
              { error: templateError },
            );
            await archiveAfterRetryLimit(msg, templateError ?? 'template not found');
            continue;
          }
        } else if (payload.text) {
          bodyHtml = wrapPlainTextAsHtml(payload.text, payload.subject);
          emailSubject = payload.subject || 'Notification';
        } else {
          console.error(`[cron-process-email-queue] Invalid message ${messageId}: no email body`);
          recordEmailStats(sundayDate, 'failed');
          await queueClient.rpc('archive_email_notification', { message_id: messageId });
          continue;
        }

        validItems.push({
          to: payload.recipient,
          subject: emailSubject,
          body_html: bodyHtml,
          metadata: payload.metadata,
        });
        validMessages.push(msg);
      }

      if (validItems.length === 0) {
        return;
      }

      const isSundayBatch = validItems.some((item) => !!item.metadata?.sunday_date);
      const batchType = isSundayBatch ? 'sunday_reminder' : 'broadcast';
      const typeTag = isSundayBatch ? '[SUNDAY-REMINDER]' : '[BROADCAST]';

      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const batchPayload: PowerAutomateBatchPayload = {
        batch_id: batchId,
        batch_type: batchType,
        count: validItems.length,
        created_at: new Date().toISOString(),
        items: validItems,
      };

      const base64Attachment = encodeBase64Utf8(JSON.stringify(batchPayload, null, 2));

      const sendResult = await sendResendEmail({
        to: targetDispatchEmail,
        subject: `[WC-BROADCAST-DISPATCH] ${typeTag} ${batchId} (${validItems.length} emails)`,
        text: `Automated ${isSundayBatch ? 'Sunday schedule reminder' : 'broadcast'} batch for Power Automate processing.\nBatch ID: ${batchId}\nBatch Type: ${batchType}\nEmail Count: ${validItems.length}\nCreated At: ${batchPayload.created_at}`,
        html: `<p>Automated <strong>${isSundayBatch ? 'Sunday schedule reminder' : 'broadcast'}</strong> batch for Power Automate processing.</p><ul><li><strong>Batch ID:</strong> ${batchId}</li><li><strong>Batch Type:</strong> ${batchType}</li><li><strong>Count:</strong> ${validItems.length}</li><li><strong>Timestamp:</strong> ${batchPayload.created_at}</li></ul><p>Please ensure your Power Automate flow is active to process the attached <code>batch-emails.json</code> file.</p>`,
        attachments: [
          {
            filename: 'batch-emails.json',
            content: base64Attachment,
            type: 'application/json',
          },
        ],
        targetType: 'power-automate-batch-dispatch',
      });

      if (!sendResult.ok) {
        console.error(
          `[cron-process-email-queue] Power Automate dispatch failed for batch ${batchId}:`,
          sendResult.error,
        );
        for (const msg of validMessages) {
          await archiveAfterRetryLimit(msg, sendResult.error);
        }
        return;
      }

      for (const msg of validMessages) {
        recordEmailStats(msg.message.metadata?.sunday_date, 'succeeded');
        await queueClient.rpc('archive_email_notification', { message_id: msg.msg_id });
        processedCount++;
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

      if (outlookDispatchEmail) {
        await processMessagesWithOutlookBatch(messages, outlookDispatchEmail);
      } else {
        for (let offset = 0; offset < messages.length; offset += EMAIL_SEND_CONCURRENCY) {
          const concurrentMessages = messages.slice(offset, offset + EMAIL_SEND_CONCURRENCY);
          await Promise.allSettled(concurrentMessages.map(processMessage));
        }
      }
    }

    for (const [sundayDate, stats] of statsByDate.entries()) {
      try {
        await queueClient.rpc('update_email_reminder_delivery_stats', {
          p_sunday_date: sundayDate,
          p_succeeded_count: stats.succeeded,
          p_failed_count: stats.failed,
        });
      } catch (statError) {
        console.warn('[cron-process-email-queue] Failed to update email delivery stats', {
          sundayDate,
          stats,
          statError,
        });
      }
    }

    if (processedCount > 0) {
      console.log('[cron-process-email-queue] Completed email batch processing:', {
        processedCount,
      });
    }

    return jsonResponse(corsHeaders, { success: true, processed: processedCount }, HTTP_STATUS.ok);
  } catch (error) {
    console.error('[cron-process-email-queue] Unexpected error', { requestId, error });
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Internal server error');
  }
}
