import { emailTemplateSchema } from './schemas';

export type EmailTemplate = import('zod').infer<typeof emailTemplateSchema>;

export type SaveEmailTemplateInput = {
  id?: string;
  name: string;
  slug: string;
  resend_template_id: string;
  required_variables: string[];
};

export type EnqueueEventPayload = {
  event_type: string;
  recipient: string;
  template_slug: string;
  metadata: Record<string, unknown>;
  idempotency_key?: string;
};

export type EnqueueEventResponse = {
  success: boolean;
  message_id: number;
};
