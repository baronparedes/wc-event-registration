import { assertEquals } from '@std/assert';

import {
  isRegistrationIdempotencyConflict,
  isRegistrationUniqueConflict,
  resolveIdempotencyRecovery,
  resolveRegistrationScopeKey,
  submitRegistrationRequestSchema,
} from '../utils.ts';

Deno.test('submitRegistrationRequestSchema requires member id for the ID-first flow', () => {
  const result = submitRegistrationRequestSchema.safeParse({
    event_slug: 'spring-gathering',
    responses: {},
    idempotency_key: 'request-1',
  });

  assertEquals(result.success, false);
});

Deno.test(
  'resolveRegistrationScopeKey uses idempotency keys only for allow-multiple policies',
  () => {
    assertEquals(resolveRegistrationScopeKey('block', 'request-1'), 'primary');
    assertEquals(resolveRegistrationScopeKey('allow_update', 'request-1'), 'primary');
    assertEquals(resolveRegistrationScopeKey('allow_multiple', 'request-1'), 'request-1');
    assertEquals(resolveRegistrationScopeKey('allow_multiple_update', 'request-1'), 'request-1');
  },
);

Deno.test('resolveIdempotencyRecovery reuses a registration only for its owner', () => {
  const existingRegistration = {
    id: 'registration-1',
    user_id: 'user-1',
    status: 'updated',
  };

  assertEquals(resolveIdempotencyRecovery(existingRegistration, 'user-1'), {
    registrationId: 'registration-1',
    status: 'updated',
    isNew: false,
    shouldWriteAnswers: false,
  });
  assertEquals(resolveIdempotencyRecovery(existingRegistration, 'user-2'), null);
  assertEquals(resolveIdempotencyRecovery(null, 'user-1'), null);
});

Deno.test(
  'registration conflict helpers recognize only their corresponding unique constraints',
  () => {
    const idempotencyConflict = {
      code: '23505',
      message: 'duplicate key violates registrations_event_idempotency_unique_idx',
    };
    const eventUserConflict = {
      code: '23505',
      details: 'Key violates registrations_event_user_unique_idx',
    };
    const unrelatedConflict = {
      code: '23505',
      message: 'duplicate key violates another_unique_idx',
    };

    assertEquals(isRegistrationIdempotencyConflict(idempotencyConflict), true);
    assertEquals(isRegistrationUniqueConflict(idempotencyConflict), true);
    assertEquals(isRegistrationIdempotencyConflict(eventUserConflict), false);
    assertEquals(isRegistrationUniqueConflict(eventUserConflict), true);
    assertEquals(isRegistrationUniqueConflict(unrelatedConflict), false);
    assertEquals(isRegistrationUniqueConflict(null), false);
  },
);
