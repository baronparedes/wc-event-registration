import { assertEquals } from '@std/assert';

import {
  type RegistrationAvailabilityEvent,
  isRegistrationOpenNow,
} from '../registrationAvailability.ts';

const NOW = Date.parse('2026-09-30T12:00:00Z');

function makeEvent(
  overrides: Partial<RegistrationAvailabilityEvent> = {},
): RegistrationAvailabilityEvent {
  return {
    registration_mode: 'open',
    registration_opens_at: null,
    registration_closes_at: null,
    ...overrides,
  };
}

Deno.test('isRegistrationOpenNow requires open registration mode', () => {
  assertEquals(isRegistrationOpenNow(makeEvent({ registration_mode: 'closed' }), NOW), false);
  assertEquals(isRegistrationOpenNow(makeEvent(), NOW), true);
});

Deno.test(
  'isRegistrationOpenNow applies inclusive opening and exclusive closing boundaries',
  () => {
    assertEquals(
      isRegistrationOpenNow(makeEvent({ registration_opens_at: new Date(NOW).toISOString() }), NOW),
      true,
    );
    assertEquals(
      isRegistrationOpenNow(
        makeEvent({ registration_opens_at: new Date(NOW + 1).toISOString() }),
        NOW,
      ),
      false,
    );
    assertEquals(
      isRegistrationOpenNow(
        makeEvent({ registration_closes_at: new Date(NOW).toISOString() }),
        NOW,
      ),
      false,
    );
  },
);

Deno.test('isRegistrationOpenNow ignores invalid date bounds', () => {
  assertEquals(
    isRegistrationOpenNow(
      makeEvent({ registration_opens_at: 'invalid', registration_closes_at: 'invalid' }),
      NOW,
    ),
    true,
  );
});
