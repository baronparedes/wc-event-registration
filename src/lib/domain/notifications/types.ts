export type AppNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export type AppNotificationRecipient = {
  id: string;
  notification_id: string;
  is_read: boolean;
  read_at: string | null;
  notification: AppNotification;
};

export type SendAppNotificationPayload = {
  title: string;
  message: string;
  targetType: 'all' | 'role' | 'user';
  targetRole?: string | null;
  targetUserId?: string | null;
  url?: string;
};

export type SendAppNotificationResponse = {
  success: boolean;
  count: number;
  notificationId: string;
};

export type ManagePushSubscriptionPayload = {
  action: 'subscribe' | 'unsubscribe';
  subscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
};
