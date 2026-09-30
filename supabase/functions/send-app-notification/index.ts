import webpush from 'web-push';
import { z } from 'zod';

import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';

const payloadSchema = z.object({
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  targetType: z.enum(['all', 'role', 'user']),
  targetRole: z.string().nullable().optional(),
  targetRoles: z.array(z.string()).nullable().optional(),
  targetUserId: z.string().uuid().nullable().optional(),
  url: z.string().optional(),
});

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const subject = 'mailto:admin@welcomehub.app';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey);
}

Deno.serve(async (req) => {
  const hook = await useEdgeHook({
    req,
    functionName: 'send-app-notification',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin'],
    schema: payloadSchema,
  });

  if (!hook.valid) {
    return hook.response;
  }

  const { client: supabase, data: payload, userId, corsHeaders } = hook;

  try {
    const resolvedRoles =
      payload.targetRoles && payload.targetRoles.length > 0
        ? payload.targetRoles
        : payload.targetRole
          ? [payload.targetRole]
          : null;

    // 1. Broadcast notification via atomic database RPC
    const { data: notificationId, error: broadcastError } = await supabase.rpc(
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
      },
    );

    if (broadcastError || !notificationId) {
      throw new Error(`Failed to broadcast notification: ${broadcastError?.message}`);
    }

    // 2. Resolve recipient auth user IDs for web push delivery
    const { data: recipients, error: recipientError } = await supabase
      .from('app_notification_recipients')
      .select('user_id')
      .eq('notification_id', notificationId);

    if (recipientError) {
      console.error('Failed to fetch recipients for push notification:', recipientError);
    }

    const userIds = recipients?.map((r) => r.user_id) ?? [];

    // 3. Send Web Push
    if (vapidPublicKey && vapidPrivateKey && userIds.length > 0) {
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

    return jsonResponse(corsHeaders, {
      success: true,
      count: userIds.length,
      notificationId,
    });
  } catch (error) {
    console.error('[send-app-notification] unexpected error:', error);
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, 'Internal server error');
  }
});
