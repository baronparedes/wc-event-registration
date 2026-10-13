import {
  type PowerAutomateBatchItem,
  type PowerAutomateBatchPayload,
  encodeBase64Utf8,
  fetchResendTemplate,
  tokenizeTemplate,
  wrapPlainTextAsHtml,
} from '../_shared/emailTemplate.ts';
import { sendResendEmail } from '../_shared/resend.ts';
import { resolveNotificationCategory } from './categories.ts';
import {
  type EmailDeliveryTracker,
  archiveAfterRetryLimit,
  fetchTemplateIdBySlug,
} from './tracker.ts';
import type { EmailQueueClient, EmailQueueMessage, NotificationCategory } from './types.ts';

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

export async function processMessagesWithOutlookBatch(
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
