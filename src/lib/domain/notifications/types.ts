export type AppNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  target_url?: string | null;
};

export type AppNotificationRecipient = {
  id: string;
  notification_id: string;
  is_read: boolean;
  read_at: string | null;
  notification: AppNotification;
};

export type BroadcastChannel = 'push' | 'email';

export type SendAppNotificationPayload = {
  title: string;
  message: string;
  channels?: BroadcastChannel[];
  targetType: 'all' | 'role' | 'user' | 'event';
  targetRole?: string | null;
  targetRoles?: string[] | null;
  targetUserId?: string | null;
  targetEventId?: string | null;
  url?: string;
};

export type SendAppNotificationResponse = {
  success: boolean;
  count: number;
  pushCount?: number;
  emailCount?: number;
  notificationId?: string | null;
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

export type BroadcastAudienceStats = {
  total_recipients: number;
  email_recipients_count: number;
  push_recipients_count: number;
  registered_members_count: number;
  public_registrants_count: number;
};
