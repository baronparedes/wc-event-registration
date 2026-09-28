export type EmailTemplate = {
  id: string;
  slug: string;
  name: string;
  resend_template_id: string;
  required_variables: string[];
  created_at: string;
  updated_at: string;
};

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
