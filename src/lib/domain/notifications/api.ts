import { createEdgeFunctionCaller, supabase } from '@/lib/infrastructure';

import type {
  AppNotificationRecipient,
  BroadcastAudienceStats,
  ManagePushSubscriptionPayload,
  SendAppNotificationPayload,
  SendAppNotificationResponse,
} from './types';

const callSendAppNotification = createEdgeFunctionCaller<
  SendAppNotificationPayload,
  SendAppNotificationResponse
>('send-app-notification');

const callManagePushSubscription = createEdgeFunctionCaller<
  ManagePushSubscriptionPayload,
  { success: boolean }
>('manage-push-subscription');

export async function sendAppNotification(
  payload: SendAppNotificationPayload,
): Promise<SendAppNotificationResponse> {
  const data = await callSendAppNotification(payload);

  if (!data || !data.success) {
    throw new Error('Failed to send broadcast notification');
  }

  return data;
}

export async function getBroadcastAudienceStats(params: {
  targetType: 'all' | 'role' | 'user' | 'event';
  targetRoles?: string[] | null;
  targetUserId?: string | null;
  targetEventId?: string | null;
}): Promise<BroadcastAudienceStats> {
  const { data, error } = await supabase.rpc('get_broadcast_audience_stats', {
    p_target_type: params.targetType,
    p_target_roles:
      params.targetRoles && params.targetRoles.length > 0 ? params.targetRoles : undefined,
    p_user_id: params.targetUserId || undefined,
    p_event_id: params.targetEventId || undefined,
  });

  if (error) {
    throw new Error(`Failed to fetch audience statistics: ${error.message}`);
  }

  return (
    (data as unknown as BroadcastAudienceStats) || {
      total_recipients: 0,
      email_recipients_count: 0,
      push_recipients_count: 0,
      registered_members_count: 0,
      public_registrants_count: 0,
    }
  );
}

export async function managePushSubscription(
  payload: ManagePushSubscriptionPayload,
): Promise<{ success: boolean }> {
  const data = await callManagePushSubscription(payload);

  if (!data?.success) {
    throw new Error('Failed to manage push subscription');
  }

  return data;
}

export async function fetchUserNotifications(): Promise<AppNotificationRecipient[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) return [];

  const { data, error } = await supabase
    .from('app_notification_recipients')
    .select(
      `
      id,
      notification_id,
      is_read,
      read_at,
      created_at,
      notification:app_notifications (
        id,
        title,
        message,
        created_at,
        target_url
      )
    `,
    )
    .eq('user_id', session.session.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return ((data || []) as unknown as AppNotificationRecipient[]).filter((n) => n && n.notification);
}

export async function markNotificationAsRead(
  recipientId: string,
): Promise<AppNotificationRecipient> {
  const { data, error } = await supabase
    .from('app_notification_recipients')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', recipientId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as AppNotificationRecipient;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) return;

  const { error } = await supabase
    .from('app_notification_recipients')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', session.session.user.id)
    .eq('is_read', false);

  if (error) throw error;
}
