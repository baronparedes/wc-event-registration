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

export type NotificationCategory = 'sunday_reminder' | 'broadcast';

type EmailQueuePayload = {
  event_type: string;
  category?: NotificationCategory | string;
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

// -----------------------------------------------------------------------------
// Category Resolution
// -----------------------------------------------------------------------------

export function resolveNotificationCategory(payload: EmailQueuePayload): NotificationCategory {
  if (payload.category === 'sunday_reminder' || payload.template_slug === 'volunteer-schedule') {
    return 'sunday_reminder';
  }
  if (
    payload.category === 'broadcast' ||
    payload.metadata?.target_type !== undefined ||
    payload.metadata?.broadcast_title !== undefined
  ) {
    return 'broadcast';
  }
  return payload.metadata?.sunday_date ? 'sunday_reminder' : 'broadcast';
}

// -----------------------------------------------------------------------------
// Delivery Stats & Archival Tracker
// -----------------------------------------------------------------------------

class EmailDeliveryTracker {
  processedCount = 0;
  private statsByDate = new Map<string, { succeeded: number; failed: number }>();

  record(sundayDate: unknown, status: 'succeeded' | 'failed'): void {
    if (typeof sundayDate !== 'string' || !sundayDate) return;
    const current = this.statsByDate.get(sundayDate) ?? { succeeded: 0, failed: 0 };
    if (status === 'succeeded') current.succeeded += 1;
    else current.failed += 1;
    this.statsByDate.set(sundayDate, current);
  }

  async flush(client: EmailQueueClient): Promise<void> {
    for (const [sundayDate, stats] of this.statsByDate.entries()) {
      try {
        await client.rpc('update_email_reminder_delivery_stats', {
          p_sunday_date: sundayDate,
          p_succeeded_count: stats.succeeded,
          p_failed_count: stats.failed,
        });
      } catch (err) {
        console.warn('[cron-process-email-queue] Failed to update delivery stats', {
          sundayDate,
          stats,
          err,
        });
      }
    }
  }
}

async function archiveAfterRetryLimit(
  client: EmailQueueClient,
  message: EmailQueueMessage,
  error: unknown,
  tracker: EmailDeliveryTracker,
): Promise<void> {
  if (message.read_ct < MAX_EMAIL_DELIVERY_ATTEMPTS) {
    return;
  }

  console.error('[cron-process-email-queue] Retry limit reached; archiving failed message', {
    messageId: message.msg_id,
    attempts: message.read_ct,
    error,
  });
  tracker.record(message.message.metadata?.sunday_date, 'failed');
  const { error: archiveError } = await client.rpc('archive_email_notification', {
    message_id: message.msg_id,
  });
  if (archiveError) {
    console.error('[cron-process-email-queue] Failed to archive exhausted message', {
      messageId: message.msg_id,
      error: archiveError,
    });
  }
}

async function fetchTemplateIdBySlug(
  client: EmailQueueClient,
  slug: string,
): Promise<string | null> {
  const { data, error } = await client
    .from('email_templates')
    .select('resend_template_id')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data.resend_template_id;
}

// -----------------------------------------------------------------------------
// Direct Resend Dispatch (when OUTLOOK_DISPATCH_EMAIL is unset)
// -----------------------------------------------------------------------------

async function processDirectMessage(
  client: EmailQueueClient,
  msg: EmailQueueMessage,
  tracker: EmailDeliveryTracker,
): Promise<void> {
  const payload = msg.message;
  const messageId = msg.msg_id;
  const sundayDate = payload.metadata?.sunday_date;

  try {
    if (payload.event_type !== 'email_notification') {
      console.warn(`[cron-process-email-queue] Skipping unknown event_type: ${payload.event_type}`);
      await client.rpc('archive_email_notification', { message_id: messageId });
      return;
    }

    let templateId: string | undefined;
    const emailText = payload.text;
    let emailSubject = payload.subject;

    if (payload.template_slug) {
      const foundTemplateId = await fetchTemplateIdBySlug(client, payload.template_slug);
      if (foundTemplateId) {
        templateId = foundTemplateId;
      } else if (payload.text) {
        console.warn(
          `[cron-process-email-queue] Template not found for slug ${payload.template_slug}; falling back to plain text email`,
        );
        emailSubject = payload.subject || 'Service Reminder';
      } else {
        console.error(
          `[cron-process-email-queue] Template not found for slug: ${payload.template_slug}`,
        );
        await archiveAfterRetryLimit(client, msg, 'template not found', tracker);
        return;
      }
    } else if (!emailText) {
      console.error(`[cron-process-email-queue] Invalid message ${messageId}: no email body`);
      tracker.record(sundayDate, 'failed');
      await client.rpc('archive_email_notification', { message_id: messageId });
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
      await archiveAfterRetryLimit(client, msg, sendResult.error, tracker);
      return;
    }

    tracker.record(sundayDate, 'succeeded');
    await client.rpc('archive_email_notification', { message_id: messageId });
    tracker.processedCount++;
  } catch (innerError) {
    console.error(`[cron-process-email-queue] Error processing message ${messageId}:`, innerError);
    await archiveAfterRetryLimit(client, msg, innerError, tracker);
  }
}

// -----------------------------------------------------------------------------
// Outlook Batch Dispatch (when OUTLOOK_DISPATCH_EMAIL is configured)
// -----------------------------------------------------------------------------

type ResolvedBatchItem = {
  item: PowerAutomateBatchItem;
  category: NotificationCategory;
};

async function resolveOutlookBatchItem(
  client: EmailQueueClient,
  msg: EmailQueueMessage,
): Promise<ResolvedBatchItem | { error: string } | null> {
  const payload = msg.message;
  const messageId = msg.msg_id;

  if (payload.event_type !== 'email_notification') {
    console.warn(`[cron-process-email-queue] Skipping unknown event_type: ${payload.event_type}`);
    await client.rpc('archive_email_notification', { message_id: messageId });
    return null;
  }

  let bodyHtml: string | undefined;
  let emailSubject: string | undefined;

  if (payload.template_slug) {
    const templateId = await fetchTemplateIdBySlug(client, payload.template_slug);
    if (templateId) {
      const resendTemplate = await fetchResendTemplate(templateId);
      if (resendTemplate?.html) {
        bodyHtml = tokenizeTemplate(resendTemplate.html, payload.metadata);
        emailSubject =
          payload.subject ||
          (resendTemplate.subject
            ? tokenizeTemplate(resendTemplate.subject, payload.metadata)
            : 'Service Reminder');
      } else if (payload.text) {
        console.warn(
          `[cron-process-email-queue] Resend template '${templateId}' returned no HTML; falling back to wrapped plain text for msg ${messageId}`,
        );
        bodyHtml = wrapPlainTextAsHtml(payload.text, payload.subject);
        emailSubject = payload.subject || 'Service Reminder';
      } else {
        return { error: 'Failed to fetch Resend template' };
      }
    } else if (payload.text) {
      console.warn(
        `[cron-process-email-queue] Template not found for slug ${payload.template_slug}; falling back to plain text email`,
      );
      bodyHtml = wrapPlainTextAsHtml(payload.text, payload.subject);
      emailSubject = payload.subject || 'Service Reminder';
    } else {
      return { error: 'template not found' };
    }
  } else if (payload.text) {
    bodyHtml = wrapPlainTextAsHtml(payload.text, payload.subject);
    emailSubject = payload.subject || 'Notification';
  } else {
    return { error: 'no email body' };
  }

  const category = resolveNotificationCategory(payload);
  return {
    category,
    item: {
      to: payload.recipient,
      subject: emailSubject,
      body_html: bodyHtml,
      metadata: payload.metadata,
    },
  };
}

async function dispatchSingleOutlookBatch(
  client: EmailQueueClient,
  category: NotificationCategory,
  items: PowerAutomateBatchItem[],
  messages: EmailQueueMessage[],
  targetDispatchEmail: string,
  tracker: EmailDeliveryTracker,
): Promise<void> {
  const isSundayBatch = category === 'sunday_reminder';
  const typeTag = isSundayBatch ? '[SUNDAY-REMINDER]' : '[BROADCAST]';
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const batchPayload: PowerAutomateBatchPayload = {
    batch_id: batchId,
    batch_type: category,
    count: items.length,
    created_at: new Date().toISOString(),
    items,
  };

  const base64Attachment = encodeBase64Utf8(JSON.stringify(batchPayload, null, 2));

  const sendResult = await sendResendEmail({
    to: targetDispatchEmail,
    subject: `[WC-BROADCAST-DISPATCH] ${typeTag} ${batchId} (${items.length} emails)`,
    text: `Automated ${isSundayBatch ? 'Sunday schedule reminder' : 'broadcast'} batch for Power Automate processing.\nBatch ID: ${batchId}\nBatch Type: ${category}\nEmail Count: ${items.length}\nCreated At: ${batchPayload.created_at}`,
    html: `<p>Automated <strong>${isSundayBatch ? 'Sunday schedule reminder' : 'broadcast'}</strong> batch for Power Automate processing.</p><ul><li><strong>Batch ID:</strong> ${batchId}</li><li><strong>Batch Type:</strong> ${category}</li><li><strong>Count:</strong> ${items.length}</li><li><strong>Timestamp:</strong> ${batchPayload.created_at}</li></ul><p>Please ensure your Power Automate flow is active to process the attached <code>batch-emails.json</code> file.</p>`,
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
      `[cron-process-email-queue] Power Automate dispatch failed for ${category} batch ${batchId}:`,
      sendResult.error,
    );
    for (const msg of messages) {
      await archiveAfterRetryLimit(client, msg, sendResult.error, tracker);
    }
    return;
  }

  for (const msg of messages) {
    tracker.record(msg.message.metadata?.sunday_date, 'succeeded');
    await client.rpc('archive_email_notification', { message_id: msg.msg_id });
    tracker.processedCount++;
  }
}

async function processMessagesWithOutlookBatch(
  client: EmailQueueClient,
  messages: EmailQueueMessage[],
  targetDispatchEmail: string,
  tracker: EmailDeliveryTracker,
): Promise<void> {
  const groups: Record<
    NotificationCategory,
    { items: PowerAutomateBatchItem[]; messages: EmailQueueMessage[] }
  > = {
    sunday_reminder: { items: [], messages: [] },
    broadcast: { items: [], messages: [] },
  };

  for (const msg of messages) {
    const resolved = await resolveOutlookBatchItem(client, msg);
    if (!resolved) {
      continue;
    }

    if ('error' in resolved) {
      if (resolved.error === 'no email body') {
        console.error(`[cron-process-email-queue] Invalid message ${msg.msg_id}: no email body`);
        tracker.record(msg.message.metadata?.sunday_date, 'failed');
        await client.rpc('archive_email_notification', { message_id: msg.msg_id });
      } else {
        await archiveAfterRetryLimit(client, msg, resolved.error, tracker);
      }
      continue;
    }

    groups[resolved.category].items.push(resolved.item);
    groups[resolved.category].messages.push(msg);
  }

  for (const category of ['sunday_reminder', 'broadcast'] as const) {
    const { items, messages: validMessages } = groups[category];
    if (items.length > 0) {
      await dispatchSingleOutlookBatch(
        client,
        category,
        items,
        validMessages,
        targetDispatchEmail,
        tracker,
      );
    }
  }
}

// -----------------------------------------------------------------------------
// Edge Function Request Handler
// -----------------------------------------------------------------------------

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
