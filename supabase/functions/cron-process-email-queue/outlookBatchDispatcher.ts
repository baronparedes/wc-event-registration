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

type ResolvedBatchEmailContent = {
  bodyHtml: string;
  subject: string;
};

async function resolveBatchEmailContent(
  client: EmailQueueClient,
  payload: EmailQueueMessage['message'],
  messageId: number,
  fallbackText: string | undefined,
  actionUrl: string | undefined,
): Promise<ResolvedBatchEmailContent | { error: string }> {
  // 1. Try resolving via Resend template if template_slug is specified
  if (payload.template_slug) {
    const templateId = await fetchTemplateIdBySlug(client, payload.template_slug);
    const isConfiguredTemplate =
      typeof templateId === 'string' &&
      templateId.length > 0 &&
      !templateId.includes('placeholder');

    if (isConfiguredTemplate && templateId) {
      const resendTemplate = await fetchResendTemplate(templateId);
      if (resendTemplate?.html) {
        return {
          bodyHtml: tokenizeTemplate(resendTemplate.html, payload.metadata),
          subject:
            payload.subject ||
            (resendTemplate.subject
              ? tokenizeTemplate(resendTemplate.subject, payload.metadata)
              : 'Service Reminder'),
        };
      }

      if (!payload.text) {
        return { error: 'Failed to fetch Resend template' };
      }
      console.warn(
        `[cron-process-email-queue] Resend template '${templateId}' returned no HTML; falling back to wrapped plain text for msg ${messageId}`,
      );
    } else {
      if (!payload.text) {
        return { error: 'template not found' };
      }
      console.warn(
        `[cron-process-email-queue] Template not configured for slug ${payload.template_slug}; falling back to plain text email`,
      );
    }
  }

  // 2. Fall back to plain text wrapped in responsive HTML layout
  if (payload.text) {
    const defaultSubject = payload.template_slug ? 'Service Reminder' : 'Notification';
    return {
      bodyHtml: wrapPlainTextAsHtml(fallbackText || payload.text, payload.subject, {
        actionUrl,
      }),
      subject: payload.subject || defaultSubject,
    };
  }

  // 3. Neither a valid template nor email text was provided
  return { error: 'no email body' };
}

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

  const rawUrl =
    typeof payload.metadata?.url === 'string'
      ? payload.metadata.url
      : typeof payload.metadata?.action_url === 'string'
        ? payload.metadata.action_url
        : undefined;

  const rawBodyText =
    typeof payload.metadata?.broadcast_message === 'string' &&
    payload.metadata.broadcast_message.trim().length > 0
      ? payload.metadata.broadcast_message
      : payload.text;

  const content = await resolveBatchEmailContent(client, payload, messageId, rawBodyText, rawUrl);

  if ('error' in content) {
    return content;
  }

  const category = resolveNotificationCategory(payload);
  return {
    category,
    item: {
      to: payload.recipient,
      subject: content.subject,
      body_html: content.bodyHtml,
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
