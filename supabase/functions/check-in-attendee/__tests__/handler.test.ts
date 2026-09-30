import { assertEquals, assertMatch } from '@std/assert';

import { handleCheckInAttendee } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const REGISTRATION_ID = '22222222-2222-4222-8222-222222222222';
const CHECK_IN_ID = '33333333-3333-4333-8333-333333333333';
const FIRST_CHECK_IN = '2026-09-30T09:00:00.000Z';
let requestNumber = 0;

async function withFunctionEnv(run: () => Promise<void>) {
  const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', TEST_ORIGIN);
  try {
    await run();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function buildRequest(body: unknown, authenticated = true) {
  const headers = new Headers({
    origin: TEST_ORIGIN,
    'content-type': 'application/json',
    'x-forwarded-for': `203.0.113.${++requestNumber}`,
  });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');

  return new Request('https://example.functions/check-in-attendee', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function payload(overrides: Record<string, unknown> = {}) {
  return { event_id: EVENT_ID, registration_id: REGISTRATION_ID, ...overrides };
}

type MockOptions = {
  event?: unknown;
  settings?: unknown;
  registration?: unknown;
  existingCheckIn?: unknown;
  insertError?: { code: string; message: string };
  slotInsertError?: { code: string; message: string };
};

function mockFetch(options: MockOptions = {}) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; method: string; url: URL; body: unknown }> = [];

  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = init?.method ?? 'GET';
    const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : null;
    calls.push({ path: url.pathname, method, url, body });

    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: crypto.randomUUID() }));
    }
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: 'admin' }));
    }
    if (url.pathname === '/rest/v1/events') {
      return Promise.resolve(
        Response.json(
          options.event === undefined
            ? { starts_at: '2026-09-30T08:00:00.000Z', ends_at: '2026-09-30T18:00:00.000Z' }
            : options.event,
        ),
      );
    }
    if (url.pathname === '/rest/v1/attendance_settings') {
      return Promise.resolve(
        Response.json(
          options.settings === undefined
            ? {
                attendance_enabled: true,
                timeslot_enabled: false,
                enforce_check_in_event_window: false,
                timeslots: [],
              }
            : options.settings,
        ),
      );
    }
    if (
      url.pathname === '/rest/v1/registrations' ||
      url.pathname === '/rest/v1/public_registrations'
    ) {
      return Promise.resolve(
        Response.json(
          options.registration === undefined
            ? { id: REGISTRATION_ID, status: 'submitted' }
            : options.registration,
        ),
      );
    }
    if (url.pathname === '/rest/v1/attendance_check_ins') {
      if (method === 'POST') {
        if (options.insertError) {
          return Promise.resolve(Response.json(options.insertError, { status: 409 }));
        }
        return Promise.resolve(
          Response.json({ id: CHECK_IN_ID, first_checked_in_at: FIRST_CHECK_IN }),
        );
      }
      return Promise.resolve(Response.json(options.existingCheckIn ?? null));
    }
    if (url.pathname === '/rest/v1/attendance_slot_records') {
      if (options.slotInsertError) {
        return Promise.resolve(Response.json(options.slotInsertError, { status: 500 }));
      }
      return Promise.resolve(new Response(null, { status: 201 }));
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('check-in-attendee rejects invalid requests and missing authentication', async () => {
  await withFunctionEnv(async () => {
    assertEquals(
      (await handleCheckInAttendee(buildRequest(payload({ event_id: 'bad' })))).status,
      400,
    );
    assertEquals((await handleCheckInAttendee(buildRequest(payload(), false))).status, 401);

    const fetchMock = mockFetch();
    try {
      const missingId = await handleCheckInAttendee(buildRequest({ event_id: EVENT_ID }));
      assertEquals(missingId.status, 400);
      assertEquals((await missingId.json()).error_code, 'INVALID_REQUEST');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('check-in-attendee creates a registered check-in for the event', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch();
    try {
      const response = await handleCheckInAttendee(buildRequest(payload()));
      assertEquals(response.status, 200);
      assertEquals(await response.json(), {
        success: true,
        result: {
          success: true,
          status: 'checked_in',
          official_check_in_time: FIRST_CHECK_IN,
          attendee_kind: 'registered',
          message: 'Check-in completed successfully.',
        },
      });
      const insert = fetchMock.calls.find(
        (call) => call.path === '/rest/v1/attendance_check_ins' && call.method === 'POST',
      );
      const insertedCheckIn = insert?.body as {
        event_id: string;
        attendee_kind: string;
        registration_id: string;
        public_registration_id: null;
        first_checked_in_at: string;
      };
      assertEquals(insertedCheckIn.event_id, EVENT_ID);
      assertEquals(insertedCheckIn.attendee_kind, 'registered');
      assertEquals(insertedCheckIn.registration_id, REGISTRATION_ID);
      assertEquals(insertedCheckIn.public_registration_id, null);
      assertMatch(insertedCheckIn.first_checked_in_at, /^\d{4}-\d{2}-\d{2}T.*Z$/);
      assertEquals(
        fetchMock.calls.some((call) => call.path === '/rest/v1/registrations'),
        true,
      );
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'check-in-attendee checks in public registrations using their own ID column',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch();
      try {
        const response = await handleCheckInAttendee(
          buildRequest({ event_id: EVENT_ID, public_registration_id: REGISTRATION_ID }),
        );
        assertEquals(response.status, 200);
        assertEquals((await response.json()).result.attendee_kind, 'public');
        assertEquals(
          fetchMock.calls.some((call) => call.path === '/rest/v1/public_registrations'),
          true,
        );
        const lookup = fetchMock.calls.find(
          (call) => call.path === '/rest/v1/attendance_check_ins' && call.method === 'GET',
        );
        assertEquals(
          lookup?.url.searchParams.get('public_registration_id'),
          `eq.${REGISTRATION_ID}`,
        );
        const insert = fetchMock.calls.find(
          (call) => call.path === '/rest/v1/attendance_check_ins' && call.method === 'POST',
        );
        assertEquals(
          (insert?.body as { public_registration_id: string; registration_id: null })
            .public_registration_id,
          REGISTRATION_ID,
        );
        assertEquals(
          (insert?.body as { public_registration_id: string; registration_id: null })
            .registration_id,
          null,
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('check-in-attendee retains the first check-in time on repeated scans', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      existingCheckIn: { id: CHECK_IN_ID, first_checked_in_at: FIRST_CHECK_IN },
    });
    try {
      const response = await handleCheckInAttendee(buildRequest(payload()));
      assertEquals(response.status, 200);
      assertEquals((await response.json()).result, {
        success: true,
        status: 'already_checked_in',
        official_check_in_time: FIRST_CHECK_IN,
        attendee_kind: 'registered',
        message: 'Attendee is already checked in.',
      });
      assertEquals(
        fetchMock.calls.some(
          (call) => call.path === '/rest/v1/attendance_check_ins' && call.method === 'POST',
        ),
        false,
      );
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('check-in-attendee rejects disabled attendance and cancelled registrations', async () => {
  await withFunctionEnv(async () => {
    const disabled = mockFetch({ settings: { attendance_enabled: false } });
    try {
      const response = await handleCheckInAttendee(buildRequest(payload()));
      assertEquals(response.status, 400);
      assertEquals((await response.json()).error_code, 'ATTENDANCE_DISABLED');
    } finally {
      disabled.restore();
    }

    const cancelled = mockFetch({ registration: { id: REGISTRATION_ID, status: 'cancelled' } });
    try {
      const response = await handleCheckInAttendee(buildRequest(payload()));
      assertEquals(response.status, 400);
      assertEquals((await response.json()).error_code, 'REGISTRATION_CANCELLED');
    } finally {
      cancelled.restore();
    }
  });
});

Deno.test(
  'check-in-attendee requires a configured slot and records it for repeat scans',
  async () => {
    await withFunctionEnv(async () => {
      const slot = '2026-09-30T09:00:00.000Z';
      const fetchMock = mockFetch({
        settings: { attendance_enabled: true, timeslot_enabled: true, timeslots: [slot] },
        existingCheckIn: { id: CHECK_IN_ID, first_checked_in_at: FIRST_CHECK_IN },
      });
      try {
        const missingSlot = await handleCheckInAttendee(buildRequest(payload()));
        assertEquals(missingSlot.status, 400);
        assertEquals((await missingSlot.json()).error_code, 'INVALID_REQUEST');
        const response = await handleCheckInAttendee(buildRequest(payload({ slot })));
        assertEquals(response.status, 200);
        assertEquals((await response.json()).result.status, 'already_checked_in');
        const slotInsert = fetchMock.calls.find(
          (call) => call.path === '/rest/v1/attendance_slot_records',
        );
        assertEquals(slotInsert?.body, { event_id: EVENT_ID, check_in_id: CHECK_IN_ID, slot });
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('check-in-attendee reports database insertion failures', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ insertError: { code: 'XX000', message: 'write failed' } });
    try {
      const response = await handleCheckInAttendee(buildRequest(payload()));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error_code, 'CHECK_IN_INSERT_FAILED');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('check-in-attendee rejects check-ins outside the enforced event window', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      event: { starts_at: '2020-01-01T09:00:00.000Z', ends_at: '2020-01-01T17:00:00.000Z' },
      settings: {
        attendance_enabled: true,
        timeslot_enabled: false,
        enforce_check_in_event_window: true,
        timeslots: [],
      },
    });
    try {
      const response = await handleCheckInAttendee(buildRequest(payload()));
      assertEquals(response.status, 400);
      assertEquals((await response.json()).error_code, 'CHECK_IN_OUTSIDE_EVENT_WINDOW');
      assertEquals(
        fetchMock.calls.some((call) => call.path === '/rest/v1/attendance_check_ins'),
        false,
      );
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('check-in-attendee returns the first check-in after a concurrent insert', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      insertError: { code: '23505', message: 'duplicate key' },
    });
    const originalFetch = globalThis.fetch;
    let checkInReads = 0;
    globalThis.fetch = (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname === '/rest/v1/attendance_check_ins' && init?.method !== 'POST') {
        checkInReads += 1;
        if (checkInReads === 2) {
          return Promise.resolve(
            Response.json({ id: CHECK_IN_ID, first_checked_in_at: FIRST_CHECK_IN }),
          );
        }
      }
      return originalFetch(input, init);
    };
    try {
      const response = await handleCheckInAttendee(buildRequest(payload()));
      assertEquals(response.status, 200);
      assertEquals((await response.json()).result.official_check_in_time, FIRST_CHECK_IN);
      assertEquals(checkInReads, 2);
    } finally {
      globalThis.fetch = originalFetch;
      fetchMock.restore();
    }
  });
});
