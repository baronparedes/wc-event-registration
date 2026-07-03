import { z } from 'zod';

import { VALIDATION_PATTERNS } from '@/config/constants';
import { buildDynamicFieldResponseSchema } from '@/lib/domain/event-fields';
import type { PublicEventField } from '@/lib/domain/event-fields';

import type { SubmitPublicRegistrationRequest } from './types';

/**
 * Schema for public attendee information
 * Used when registering as a public (non-member) attendee
 */
export const publicAttendeeInfoSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be 100 characters or less'),
  nickname: z.string().max(100, 'Nickname must be 100 characters or less').nullable().optional(),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be 100 characters or less'),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  phone: z
    .string()
    .regex(VALIDATION_PATTERNS.phone, 'Invalid Philippine mobile number (e.g. 09XX XXX XXXX)')
    .nullable()
    .optional()
    .or(z.literal('')), // Allow empty string as valid optional value
});

export type PublicAttendeeInfoInput = z.infer<typeof publicAttendeeInfoSchema>;

/**
 * Schema for public registration submission
 * Composes attendee info + event field responses
 */
export function buildSubmitPublicRegistrationSchema(
  fields: PublicEventField[],
): z.ZodSchema<SubmitPublicRegistrationRequest> {
  const responseSchema = buildDynamicFieldResponseSchema(fields);

  return z.object({
    event_slug: z.string().min(1, 'Event slug is required'),
    attendee: publicAttendeeInfoSchema,
    responses: responseSchema,
    idempotency_key: z.string().min(1, 'Idempotency key is required'),
  });
}

/**
 * Schema for public attendee lookup (email check)
 */
export const publicAttendeeCheckSchema = z.object({
  email: z.string().email('Invalid email address'),
  event_slug: z.string().min(1, 'Event slug is required'),
});

export type PublicAttendeeCheckInput = z.infer<typeof publicAttendeeCheckSchema>;

/**
 * Schema for admin to cancel a public registration
 */
export const cancelPublicRegistrationSchema = z.object({
  registration_id: z.string().uuid('Invalid registration ID'),
  reason: z.string().optional(),
});

export type CancelPublicRegistrationInput = z.infer<typeof cancelPublicRegistrationSchema>;
