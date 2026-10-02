import type { SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';

import type { Database } from '@/shared/database.types.ts';
import { isLocalBroadcastEnabled, logLocalBroadcast } from '@/shared/localBroadcast.ts';

import type { SendAppNotificationPayload } from '../types.ts';

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const subject = 'mailto:admin@welcomehub.app';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey);
}

export interface SendPushNotificationsParams {
  supabase: SupabaseClient<Database>;
  payload: SendAppNotificationPayload;
  resolvedRoles?: string[] | null;
  userId?: string | null;
}

export interface SendPushNotificationsResult {
  notificationId: string;
  pushCount: number;
}

export async function sendPushNotifications({
  supabase,
  payload,
  resolvedRoles,
  userId,
}: SendPushNotificationsParams): Promise<SendPushNotificationsResult> {
  const { data: createdNotificationId, error: broadcastError } = await supabase.rpc(
    'broadcast_app_notification',
    {
      p_title: payload.title,
      p_message: payload.message,
      p_target_type: payload.targetType,
      p_target_role: payload.targetRole ?? resolvedRoles?.[0] ?? undefined,
      p_target_roles: resolvedRoles ?? undefined,
      p_user_ids: payload.targetUserId ? [payload.targetUserId] : undefined,
      p_created_by: userId ?? undefined,
      p_target_url: payload.url || null,
      p_event_id: payload.targetEventId ?? undefined,
    },
  );

  if (broadcastError || !createdNotificationId) {
    throw new Error(`Failed to broadcast notification: ${broadcastError?.message}`);
  }

  const notificationId = createdNotificationId;

  // Resolve recipient auth user IDs for web push delivery
  const { data: recipients, error: recipientError } = await supabase
    .from('app_notification_recipients')
    .select('user_id')
    .eq('notification_id', notificationId);

  if (recipientError) {
    console.error('Failed to fetch recipients for push notification:', recipientError);
  }

  const userIds = recipients?.map((r) => r.user_id) ?? [];
  const pushCount = userIds.length;

  // Send Web Push to subscribed devices (skipped when local broadcast is active)
  if (!isLocalBroadcastEnabled() && vapidPublicKey && vapidPrivateKey && userIds.length > 0) {
    const { data: subscriptions } = await supabase
      .from('user_push_subscriptions')
      .select('user_id, endpoint, auth_key, p256dh_key')
      .in('user_id', userIds);

    if (subscriptions && subscriptions.length > 0) {
      const subscribedUserIds = Array.from(new Set(subscriptions.map((s) => s.user_id)));

      const { data: unreadRows, error: unreadError } = await supabase
        .from('app_notification_recipients')
        .select('user_id')
        .in('user_id', subscribedUserIds)
        .eq('is_read', false);

      if (unreadError) {
        console.error('Failed to fetch unread counts for push notifications:', unreadError);
      }

      const unreadCountByUser = new Map<string, number>();
      unreadRows?.forEach((row) => {
        unreadCountByUser.set(row.user_id, (unreadCountByUser.get(row.user_id) ?? 0) + 1);
      });

      const pushPromises = subscriptions.map((sub) => {
        const unreadCount = unreadCountByUser.get(sub.user_id) ?? 1;
        const pushPayload = JSON.stringify({
          title: payload.title,
          body: payload.message,
          url: payload.url || (payload.targetType === 'role' ? '/admin/notifications' : '/'),
          unreadCount,
        });

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth_key,
            p256dh: sub.p256dh_key,
          },
        };
        return webpush.sendNotification(pushSubscription, pushPayload).catch((err: unknown) => {
          console.error(`Failed to push to user ${sub.user_id}:`, err);
        });
      });

      await Promise.allSettled(pushPromises);
    }
  } else if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping web push.');
  }

  // Log to local file if active
  if (isLocalBroadcastEnabled() && userIds.length > 0) {
    for (const targetId of userIds) {
      await logLocalBroadcast({
        type: 'push',
        targetType: payload.targetType,
        targetEventId: payload.targetEventId,
        targetRoles: resolvedRoles,
        targetUserId: payload.targetUserId,
        recipient: targetId,
        title: payload.title,
        body: payload.message,
        url: payload.url,
      });
    }
  }

  return { notificationId, pushCount };
}
