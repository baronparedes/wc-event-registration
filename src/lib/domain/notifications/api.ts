import { supabase } from '@/lib/infrastructure';

import type {
  AppNotificationRecipient,
  ManagePushSubscriptionPayload,
  SendAppNotificationPayload,
  SendAppNotificationResponse,
} from './types';

export async function sendAppNotification(
  payload: SendAppNotificationPayload,
): Promise<SendAppNotificationResponse> {
  const { data, error } = await supabase.functions.invoke<SendAppNotificationResponse>(
    'send-app-notification',
    {
      body: payload,
    },
  );

  if (error) {
    throw error;
  }

  if (!data || !data.success) {
    throw new Error('Failed to send broadcast notification');
  }

  return data;
}

export async function managePushSubscription(
  payload: ManagePushSubscriptionPayload,
): Promise<{ success: boolean }> {
  const { data, error } = await supabase.functions.invoke<{ success: boolean }>(
    'manage-push-subscription',
    {
      body: payload,
    },
  );

  if (error) {
    throw error;
  }

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
      notification:app_notifications (
        id,
        title,
        message,
        created_at
      )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as unknown as AppNotificationRecipient[];
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
