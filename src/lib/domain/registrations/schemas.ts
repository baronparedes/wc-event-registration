import { z } from 'zod';

import type { AdminEventField } from '@/lib/domain/event-fields';
import { buildDynamicFieldResponseSchema } from '@/lib/domain/event-fields';

import { REGISTRATION_SHARE_FIELDS } from './types';

export const registrationShareFieldSchema = z.enum(REGISTRATION_SHARE_FIELDS);

export const registrationShareRowSchema = z.object({
  full_name: z.string(),
  member_id: z.string(),
  email: z.string(),
  phone: z.string(),
  metadata: z.string(),
  role: z.string(),
  category: z.string(),
  registration_status: z.string(),
  submitted_at: z.string(),
  updated_at: z.string(),
  answer_values: z.record(z.string(), z.string()),
});

export const registrationShareAnswerFieldSchema = z.object({
  field_id: z.string(),
  label: z.string(),
});

export const exportRegistrationNamesResponseSchema = z.object({
  success: z.literal(true),
  event_title: z.string(),
  row_count: z.number().int().nonnegative(),
  answer_fields: z.array(registrationShareAnswerFieldSchema),
  rows: z.array(registrationShareRowSchema),
});

export function buildBulkRegistrationCsvRowSchema(fields: AdminEventField[]) {
  const optionalFields = fields.map((field) => ({ ...field, is_required: false }));

  return z.object({
    member_id: z.string().trim().min(1, 'member_id is required'),
    registration_id: z.string().trim().optional(),
    answers: buildDynamicFieldResponseSchema(optionalFields),
  });
}

export function buildBulkRegistrationCsvRowsSchema(fields: AdminEventField[]) {
  return z
    .array(buildBulkRegistrationCsvRowSchema(fields))
    .min(1, 'At least one CSV row is required for bulk upload.');
}

export type BulkRegistrationCsvRow = z.infer<ReturnType<typeof buildBulkRegistrationCsvRowSchema>>;
