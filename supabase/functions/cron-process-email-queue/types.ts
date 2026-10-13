import type { EmailQueuePayload, NotificationCategory } from '../_shared/emailQueue.ts';

export type { EmailQueuePayload, NotificationCategory };

export type RpcResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

export type EmailQueueMessage = {
  msg_id: number;
  read_ct: number;
  message: EmailQueuePayload;
};

export type EmailTemplate = {
  resend_template_id: string;
};

export type EmailQueueClient = {
  rpc(
    functionName: 'pop_email_notifications',
    args: { batch_size: number },
  ): Promise<RpcResult<EmailQueueMessage[]>>;
  rpc(
    functionName: 'archive_email_notification',
    args: { message_id: number },
  ): Promise<RpcResult<boolean>>;
  rpc(
    functionName: 'update_email_reminder_delivery_stats',
    args: { p_sunday_date: string; p_succeeded_count: number; p_failed_count: number },
  ): Promise<RpcResult<void>>;
  from(table: 'email_templates'): {
    select(columns: 'resend_template_id'): {
      eq(
        column: 'slug',
        value: string,
      ): {
        single(): Promise<RpcResult<EmailTemplate>>;
      };
    };
  };
};

export const MAX_EMAIL_DELIVERY_ATTEMPTS = 5;
export const EMAIL_QUEUE_BATCH_SIZE = 50;
export const EMAIL_SEND_CONCURRENCY = 5;
