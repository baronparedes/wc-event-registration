import {
  type EmailQueueClient,
  type EmailQueueMessage,
  MAX_EMAIL_DELIVERY_ATTEMPTS,
} from './types.ts';

export class EmailDeliveryTracker {
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

export async function archiveAfterRetryLimit(
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

export async function fetchTemplateIdBySlug(
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
