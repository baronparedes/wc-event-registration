import type { EventFieldType } from '@/lib/domain/event-fields';

export type FormStatus = 'draft' | 'published' | 'archived';
export type FormAudience = 'members' | 'public' | 'members_and_public';
export type FormDuplicatePolicy =
  | 'block'
  | 'allow_update'
  | 'allow_multiple'
  | 'allow_multiple_update';

export type AdminForm = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: FormStatus;
  duplicate_policy: FormDuplicatePolicy;
  audience: FormAudience;
  metadata: Record<string, unknown>;
  created_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FormFieldApplicability = 'all' | 'member_only' | 'public_only';

export type FormField = {
  id: string;
  form_id: string;
  field_key: string;
  label: string;
  field_type: EventFieldType;
  is_required: boolean;
  is_active: boolean;
  placeholder: string | null;
  help_text: string | null;
  options: Array<{ label: string; value: string }>;
  validation_rules: Record<string, unknown>;
  field_applicability: FormFieldApplicability;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type FormSubmissionStatus = 'submitted' | 'cancelled';

export type FormSubmissionAnswer = {
  id: string;
  submission_id: string;
  form_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_date: string | null;
  answer_json: unknown | null;
  created_at: string;
  updated_at: string;
  form_fields?: {
    field_key: string;
    label: string;
    field_type: EventFieldType;
  };
};

export type FormSubmission = {
  id: string;
  form_id: string;
  user_id: string | null;
  public_registrant_info: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  } | null;
  status: FormSubmissionStatus;
  idempotency_key: string | null;
  source: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  users?: {
    member_id: string;
    full_name: string;
    email: string | null;
  } | null;
  form_submission_answers?: FormSubmissionAnswer[];
};
