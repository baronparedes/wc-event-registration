import { z } from '@/shared/validation.ts';

const bulkRowSchema = z
  .object({
    attendee_kind: z.enum(['registered', 'public']),
    registration_id: z.string().uuid().optional(),
    public_registration_id: z.string().uuid().optional(),
    answers: z.record(z.string(), z.unknown()),
  })
  .superRefine((value, context) => {
    if (value.attendee_kind === 'registered' && !value.registration_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['registration_id'],
        message: 'registration_id is required for registered rows.',
      });
    }

    if (value.attendee_kind === 'public' && !value.public_registration_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['public_registration_id'],
        message: 'public_registration_id is required for public rows.',
      });
    }
  });

export const requestSchema = z.object({
  event_id: z.string().uuid('event_id must be a valid UUID'),
  rows: z.array(bulkRowSchema).min(1, 'rows must include at least one item'),
  uploaded_field_keys: z.array(z.string()).optional(),
});

export type RequestPayload = z.infer<typeof requestSchema>;

export function findUnsupportedAnswerKeys(
  answerKeys: string[],
  knownFieldKeys: ReadonlySet<string>,
): string[] {
  return answerKeys.filter((key) => !knownFieldKeys.has(key));
}
