import type { EmailQueuePayload, NotificationCategory } from './types.ts';

export function resolveNotificationCategory(payload: EmailQueuePayload): NotificationCategory {
  if (payload.category === 'approval') {
    return 'approval';
  }
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
