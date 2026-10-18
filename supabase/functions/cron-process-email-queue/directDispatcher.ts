import { wrapPlainTextAsHtml } from '../_shared/emailTemplate.ts';
import { sendResendEmail } from '../_shared/resend.ts';
import {
  type EmailDeliveryTracker,
  archiveAfterRetryLimit,
  fetchTemplateIdBySlug,
} from './tracker.ts';
import type { EmailQueueClient, EmailQueueMessage } from './types.ts';

export async function processDirectMessage(
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
      const isConfiguredTemplate =
        typeof foundTemplateId === 'string' &&
        foundTemplateId.length > 0 &&
        !foundTemplateId.includes('placeholder');
      if (isConfiguredTemplate && foundTemplateId) {
        templateId = foundTemplateId;
      } else if (payload.text) {
        console.warn(
          `[cron-process-email-queue] Template not configured for slug ${payload.template_slug}; falling back to standard email`,
        );
        emailSubject = payload.subject || 'Notification';
      } else {
        console.error(
          `[cron-process-email-queue] Template not found for slug: ${payload.template_slug}`,
        );
        await archiveAfterRetryLimit(client, msg, 'template not found', tracker);
        return;
      }
    } else if (!emailText && !payload.html && !payload.metadata?.html) {
      console.error(`[cron-process-email-queue] Invalid message ${messageId}: no email body`);
      tracker.record(sundayDate, 'failed');
      await client.rpc('archive_email_notification', { message_id: messageId });
      return;
    }

    const rawUrl =
      typeof payload.metadata?.url === 'string'
        ? payload.metadata.url
        : typeof payload.metadata?.action_url === 'string'
          ? payload.metadata.action_url
          : undefined;
    const bodyText =
      typeof payload.metadata?.broadcast_message === 'string' &&
      payload.metadata.broadcast_message.trim().length > 0
        ? payload.metadata.broadcast_message
        : emailText;

    let emailHtml: string | undefined =
      typeof payload.html === 'string' && payload.html.trim().length > 0
        ? payload.html
        : typeof payload.metadata?.html === 'string' &&
            (payload.metadata.html as string).trim().length > 0
          ? (payload.metadata.html as string)
          : undefined;

    if (!emailHtml && !templateId && rawUrl) {
      emailHtml = wrapPlainTextAsHtml(bodyText || emailText || '', emailSubject, {
        actionUrl: rawUrl,
      });
    }

    const isSundayReminder = typeof sundayDate === 'string' && sundayDate.length > 0;
    const targetType =
      typeof payload.metadata?.target_type === 'string'
        ? (payload.metadata.target_type as string)
        : payload.category === 'approval'
          ? 'approval-notification'
          : isSundayReminder
            ? 'sunday-schedule-reminder'
            : 'broadcast-notification';

    const sendResult = await sendResendEmail({
      to: payload.recipient,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      template_id: templateId,
      variables: payload.metadata,
      data: payload.metadata,
      metadata: payload.metadata,
      targetType,
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
