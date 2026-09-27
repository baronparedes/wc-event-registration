import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import webpush from 'npm:web-push';
import { z } from 'npm:zod';

import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';

const payloadSchema = z.object({
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  targetType: z.enum(['all', 'role', 'user']),
  targetRole: z.string().nullable().optional(),
  targetUserId: z.string().uuid().nullable().optional(),
});

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const subject = 'mailto:admin@welcomehub.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey);
}

serve(async (req) => {
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
    // 1. Insert into app_notifications
    const { data: notification, error: notifError } = await supabase
      .from('app_notifications')
      .insert({
        title: payload.title,
        message: payload.message,
        target_type: payload.targetType,
        target_role: payload.targetRole,
        created_by: userId,
      })
      .select('id')
      .single();

    if (notifError || !notification) {
      throw new Error(`Failed to create notification: ${notifError?.message}`);
    }

    const notificationId = notification.id;

    // 2. Resolve users
    let userIds: string[] = [];

    if (payload.targetType === 'all') {
      const { data: users } = await supabase.from('users').select('id').eq('is_active', true);
      userIds = users?.map((u) => u.id) ?? [];
    } else if (payload.targetType === 'role' && payload.targetRole) {
      const { data: adminRoles } = await supabase
        .from('admin_roles')
        .select('auth_user_id')
        .eq('role', payload.targetRole);
      userIds = adminRoles?.map((r) => r.auth_user_id) ?? [];
    } else if (payload.targetType === 'user' && payload.targetUserId) {
      userIds = [payload.targetUserId];
    }

    if (userIds.length === 0) {
      return jsonResponse(corsHeaders, { success: true, count: 0 });
    }

    // 3. Insert recipients in chunks
    const recipientInserts = userIds.map((id) => ({
      notification_id: notificationId,
      user_id: id,
      is_read: false,
    }));

    for (let i = 0; i < recipientInserts.length; i += 1000) {
      const chunk = recipientInserts.slice(i, i + 1000);
      const { error: recipientError } = await supabase
        .from('app_notification_recipients')
        .insert(chunk);
      if (recipientError) {
        console.error('Failed to insert recipients chunk:', recipientError);
      }
    }

    // 4. Send Web Push
    if (vapidPublicKey && vapidPrivateKey) {
      // Chunk user IDs for subscription lookup if needed, assuming < 1000 for MVP
      const { data: subscriptions } = await supabase
        .from('user_push_subscriptions')
        .select('user_id, endpoint, auth_key, p256dh_key')
        .in('user_id', userIds);

      if (subscriptions && subscriptions.length > 0) {
        const pushPayload = JSON.stringify({
          title: payload.title,
          body: payload.message,
          url: '/admin/notifications', // default url if clicked
        });

        const pushPromises = subscriptions.map((sub) => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth_key,
              p256dh: sub.p256dh_key,
            },
          };
          return webpush.sendNotification(pushSubscription, pushPayload).catch((err) => {
            console.error(`Failed to push to user ${sub.user_id}:`, err);
          });
        });

        await Promise.allSettled(pushPromises);
      }
    } else {
      console.warn('VAPID keys not configured, skipping web push.');
    }

    return jsonResponse(corsHeaders, { success: true, count: userIds.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, message);
  }
});
