import { assertEquals } from '@std/assert';

import { handleUpdateAttendanceSettings } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const EVENT_START = '2026-10-01T09:00:00.000Z';
const EVENT_END = '2026-10-01T17:00:00.000Z';

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

let requestNumber = 0;

function buildRequest(body: unknown) {
  return new Request('https://example.functions/update-attendance-settings', {
    method: 'POST',
    headers: {
      origin: TEST_ORIGIN,
      'content-type': 'application/json',
      authorization: 'Bearer admin-access-token',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { event?: unknown; eventError?: boolean; upsertError?: boolean }) {
  const originalFetch = globalThis.fetch;
  const upserts: Array<{ body: unknown; url: URL }> = [];
  globalThis.fetch = (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: crypto.randomUUID() }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: 'admin' }));
    }
    if (requestUrl.pathname === '/rest/v1/events') {
      if (options.eventError) {
        return Promise.resolve(Response.json({ message: 'event lookup failed' }, { status: 500 }));
      }
      return Promise.resolve(
        Response.json(
          Object.hasOwn(options, 'event')
            ? options.event
            : { id: EVENT_ID, starts_at: EVENT_START, ends_at: EVENT_END },
        ),
      );
    }
    if (requestUrl.pathname === '/rest/v1/attendance_settings' && init?.method === 'POST') {
      upserts.push({ body: JSON.parse(String(init.body)) as unknown, url: requestUrl });
      if (options.upsertError) {
        return Promise.resolve(
          Response.json({ message: 'settings write failed' }, { status: 500 }),
        );
      }
      return Promise.resolve(Response.json({ event_id: EVENT_ID, attendance_enabled: true }));
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };
  return {
    upserts,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

const VALID_SLOTS = [
  {
    slot_at: '2026-10-01T12:30:00.000Z',
    opens_at: null,
    closes_at: null,
  },
  {
    slot_at: '2026-10-01T10:30:00.000Z',
    opens_at: null,
    closes_at: null,
  },
  {
    slot_at: '2026-10-01T12:30:00.000Z',
    opens_at: null,
    closes_at: null,
  },
];

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    event_id: EVENT_ID,
    attendance_enabled: true,
    timeslot_enabled: true,
    timeslots: VALID_SLOTS,
    ...overrides,
  };
}

Deno.test(
  'update-attendance-settings rejects invalid attendance and timeslot combinations',
  async () => {
    await withFunctionEnv(async () => {
      const response = await handleUpdateAttendanceSettings(
        buildRequest(basePayload({ attendance_enabled: false, timeslot_enabled: true })),
      );
      assertEquals(response.status, 400);
    });
  },
);

Deno.test(
  'update-attendance-settings sorts and deduplicates valid timeslots before saving',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({});
      try {
        const response = await handleUpdateAttendanceSettings(buildRequest(basePayload()));
        assertEquals(response.status, 200);
        const savedSettings = fetchMock.upserts[0].body as {
          timeslots: Array<{ slot_at: string }>;
          enforce_check_in_event_window: boolean;
        };
        assertEquals(
          savedSettings.timeslots.map((slot) => slot.slot_at),
          ['2026-10-01T10:30:00.000Z', '2026-10-01T12:30:00.000Z'],
        );
        assertEquals(savedSettings.enforce_check_in_event_window, true);
        assertEquals(fetchMock.upserts[0].url.searchParams.get('on_conflict'), 'event_id');
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('update-attendance-settings rejects a timeslot outside the event window', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({});
    try {
      const response = await handleUpdateAttendanceSettings(
        buildRequest(
          basePayload({
            timeslots: [
              {
                slot_at: '2026-10-01T18:00:00.000Z',
                opens_at: null,
                closes_at: null,
              },
            ],
          }),
        ),
      );
      assertEquals(response.status, 400);
      assertEquals((await response.json()).error_code, 'INVALID_TIMESLOT_RANGE');
      assertEquals(fetchMock.upserts, []);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('update-attendance-settings maps missing events and upsert errors', async () => {
  await withFunctionEnv(async () => {
    const missingMock = mockFetch({ event: null });
    try {
      const response = await handleUpdateAttendanceSettings(buildRequest(basePayload()));
      assertEquals(response.status, 404);
      assertEquals((await response.json()).error_code, 'EVENT_NOT_FOUND');
    } finally {
      missingMock.restore();
    }

    const errorMock = mockFetch({ upsertError: true });
    try {
      const response = await handleUpdateAttendanceSettings(buildRequest(basePayload()));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error_code, 'UPSERT_FAILED');
    } finally {
      errorMock.restore();
    }
  });
});
