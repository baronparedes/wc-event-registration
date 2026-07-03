import { z } from 'zod';

import { REGISTRATION_SHARE_FIELDS } from './types';

export const registrationShareFieldSchema = z.enum(REGISTRATION_SHARE_FIELDS);

export const registrationShareRowSchema = z.object({
  full_name: z.string(),
  member_id: z.string(),
  email: z.string(),
  role: z.string(),
  category: z.string(),
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
