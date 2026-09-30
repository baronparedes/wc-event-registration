import { POSTGRES_ERROR_CODES } from '@/shared/constants.ts';
import { z } from '@/shared/validation.ts';

export const submitRegistrationRequestSchema = z.object({
  event_slug: z.string().trim().min(1, 'event_slug is required'),
  member_id: z.string().trim().min(1, 'member_id is required'),
  responses: z.record(z.string(), z.unknown()),
  idempotency_key: z.string().trim().min(1, 'idempotency_key is required'),
});

export type SubmitRegistrationRequest = z.infer<typeof submitRegistrationRequestSchema>;

export interface PostgrestErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

interface ExistingRegistration {
  id: string;
  user_id: string;
  status: string;
}

export interface IdempotencyRecovery {
  registrationId: string;
  status: 'submitted' | 'updated';
  isNew: false;
  shouldWriteAnswers: false;
}

const REGISTRATION_EVENT_USER_UNIQUE_CONSTRAINT = 'registrations_event_user_unique_idx';
const REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT =
  'registrations_event_idempotency_unique_idx';

export function resolveRegistrationScopeKey(
  duplicatePolicy: string,
  idempotencyKey: string,
): string {
  return duplicatePolicy === 'allow_multiple' || duplicatePolicy === 'allow_multiple_update'
    ? idempotencyKey
    : 'primary';
}

export function isUniqueConstraintError(
  error: PostgrestErrorLike | null,
  constraint: string,
): boolean {
  if (!error || error.code !== POSTGRES_ERROR_CODES.uniqueViolation) {
    return false;
  }

  const combinedMessage = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`;
  return combinedMessage.includes(constraint);
}

export function isRegistrationUniqueConflict(error: PostgrestErrorLike | null): boolean {
  return (
    isUniqueConstraintError(error, REGISTRATION_EVENT_USER_UNIQUE_CONSTRAINT) ||
    isUniqueConstraintError(error, REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT)
  );
}

export function isRegistrationIdempotencyConflict(error: PostgrestErrorLike | null): boolean {
  return isUniqueConstraintError(error, REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT);
}

export function resolveIdempotencyRecovery(
  existingRegistration: ExistingRegistration | null,
  userId: string,
): IdempotencyRecovery | null {
  if (!existingRegistration || existingRegistration.user_id !== userId) {
    return null;
  }

  return {
    registrationId: existingRegistration.id,
    status: existingRegistration.status === 'updated' ? 'updated' : 'submitted',
    isNew: false,
    shouldWriteAnswers: false,
  };
}
