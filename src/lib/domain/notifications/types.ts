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

export type SundayVolunteerRecipient = {
  user_id: string;
  member_id: string | null;
  full_name: string;
  email: string | null;
  avatar_object_key?: string | null;
  formatted_slots: string;
  has_push: boolean;
  has_email: boolean;
};

export type SundayDeliveryStatus = 'queued' | 'completed' | 'partial_failure' | 'failed';

export type SundayChannelDeliveryStats = {
  already_sent: boolean;
  sent_at: string | null;
  total_queued: number;
  succeeded_count: number;
  failed_count: number;
  status: SundayDeliveryStatus;
  updated_at?: string;
};

export type SundaySchedulePreview = {
  sunday_date: string;
  ordinal: number;
  sunday_key: string;
  already_sent_push: boolean;
  push_sent_at: string | null;
  already_sent_email: boolean;
  email_sent_at: string | null;
  push_delivery?: SundayChannelDeliveryStats | null;
  email_delivery?: SundayChannelDeliveryStats | null;
  total_volunteers: number;
  push_eligible_count: number;
  email_eligible_count: number;
  volunteers: SundayVolunteerRecipient[];
};

export type DispatchSundayRemindersPayload = {
  targetSundayDate?: string;
  channels: BroadcastChannel[];
  force?: boolean;
};

export type DispatchSundayRemindersResponse = {
  success: boolean;
  sunday_date: string;
  push_enqueued: number;
  email_enqueued: number;
};
