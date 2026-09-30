import { assertEquals } from '@std/assert';

import { handleListAttendees } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_USER_ID = '22222222-2222-4222-8222-222222222222';
const REGISTERED_ID = '33333333-3333-4333-8333-333333333333';
const PUBLIC_ID = '44444444-4444-4444-8444-444444444444';
const CHECKED_IN_AT = '2026-09-27T09:15:00.000Z';

async function withFunctionEnv(run: () => Promise<void>) {
  const previousValues = new Map<string, string | undefined>(
    ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'].map((name) => [
      name,
      Deno.env.get(name),
    ]),
  );
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', TEST_ORIGIN);

  try {
    await run();
  } finally {
    for (const [name, value] of previousValues) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function buildRequest(body: unknown, authenticated = true) {
  const headers = new Headers({
    origin: TEST_ORIGIN,
    'content-type': 'application/json',
  });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');

  return new Request('https://example.functions/list-attendees', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: {
  attendanceEnabled?: boolean;
  registrations?: unknown;
  publicRegistrations?: unknown;
  errors?: Set<string>;
}) {
  const originalFetch = globalThis.fetch;
  const requests: URL[] = [];
  const errors = options.errors ?? new Set<string>();

  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = input instanceof Request ? input.method : (init?.method ?? 'GET');
    requests.push(url);

    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: ADMIN_USER_ID }));
    }
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-record', role: 'admin' }));
    }
    const table = url.pathname.split('/').at(-1) ?? '';
    if (errors.has(table)) {
      return Promise.resolve(
        Response.json({ code: 'XX000', message: `${table} failed` }, { status: 500 }),
      );
    }
    if (table === 'attendance_settings') {
      return Promise.resolve(
        Response.json({ attendance_enabled: options.attendanceEnabled ?? true }),
      );
    }
    if (table === 'registrations') {
      return Promise.resolve(Response.json(options.registrations ?? []));
    }
    if (table === 'public_registrations') {
      return Promise.resolve(Response.json(options.publicRegistrations ?? []));
    }
    if (table === 'attendance_check_ins') {
      if (url.searchParams.get('select')?.startsWith('public_registration_id')) {
        return Promise.resolve(
          Response.json([
            {
              public_registration_id: PUBLIC_ID,
              first_checked_in_at: CHECKED_IN_AT,
            },
          ]),
        );
      }
      return Promise.resolve(
        Response.json([{ registration_id: REGISTERED_ID, first_checked_in_at: CHECKED_IN_AT }]),
      );
    }
    if (table === 'attendance_answers') {
      return Promise.resolve(
        Response.json([
          {
            registration_id: REGISTERED_ID,
            attendance_field_id: 'attendance-field-1',
            answer_text: 'Arrived',
            answer_number: null,
            attendance_fields: {
              id: 'attendance-field-1',
              field_type: 'text',
              field_key: 'arrival_note',
              label: 'Arrival Note',
              display_order: 1,
            },
          },
        ]),
      );
    }
    if (table === 'public_attendance_answers') return Promise.resolve(Response.json([]));
    if (table === 'registration_answers') {
      return Promise.resolve(
        Response.json([
          {
            registration_id: REGISTERED_ID,
            event_field_id: 'event-field-1',
            answer_text: null,
            answer_number: null,
            answer_boolean: true,
            answer_date: null,
            answer_json: null,
            event_fields: {
              id: 'event-field-1',
              field_type: 'boolean',
              field_key: 'needs_help',
              label: 'Needs Help',
              display_order: 1,
            },
          },
        ]),
      );
    }
    if (table === 'public_registration_answers') return Promise.resolve(Response.json([]));

    return Promise.resolve(
      new Response(`Unexpected ${method} request: ${url.pathname}`, { status: 500 }),
    );
  };

  return {
    requests,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

function registeredRow() {
  return {
    id: REGISTERED_ID,
    user_id: 'member-user-id',
    status: 'submitted',
    submitted_at: '2026-09-26T10:00:00.000Z',
    users: {
      id: 'member-user-id',
      member_id: 'M-001',
      last_name: 'Zed',
      full_name: 'Ada Zed',
      email: 'ada@example.com',
      role: ' Member ',
      category: ' Adults ',
      nickname: 'Ada',
    },
  };
}

function publicRow() {
  return {
    id: PUBLIC_ID,
    first_name: 'Bea',
    last_name: 'Guest',
    nickname: null,
    email: 'bea@example.com',
    status: 'updated',
    submitted_at: '2026-09-26T11:00:00.000Z',
  };
}

Deno.test('list-attendees validates event IDs and requires admin authentication', async () => {
  await withFunctionEnv(async () => {
    const invalid = await handleListAttendees(buildRequest({ event_id: 'bad' }));
    const unauthorized = await handleListAttendees(buildRequest({ event_id: EVENT_ID }, false));

    assertEquals(invalid.status, 400);
    assertEquals(unauthorized.status, 401);
  });
});

Deno.test('list-attendees returns disabled without querying attendee registrations', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ attendanceEnabled: false });
    try {
      const response = await handleListAttendees(buildRequest({ event_id: EVENT_ID }));

      assertEquals(response.status, 400);
      assertEquals((await response.json()).error_code, 'ATTENDANCE_DISABLED');
      assertEquals(
        fetchMock.requests.some((url) => url.pathname.endsWith('/registrations')),
        false,
      );
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('list-attendees combines member and public attendee details', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      registrations: [registeredRow()],
      publicRegistrations: [publicRow()],
    });

    try {
      const response = await handleListAttendees(buildRequest({ event_id: EVENT_ID }));
      const body = await response.json();
      const results = body.results;

      assertEquals(response.status, 200);
      assertEquals(body.success, true);
      assertEquals(
        results.map((result: { full_name: string }) => result.full_name),
        ['Ada Zed', 'Bea Guest'],
      );
      assertEquals(results[0], {
        attendee_kind: 'registered',
        registration_id: REGISTERED_ID,
        public_registration_id: null,
        user_id: 'member-user-id',
        member_id: 'M-001',
        full_name: 'Ada Zed',
        email: 'ada@example.com',
        role: 'Member',
        category: 'Adults',
        registration_status: 'submitted',
        submitted_at: '2026-09-26T10:00:00.000Z',
        check_in_status: 'checked_in',
        official_check_in_time: CHECKED_IN_AT,
        registration_answers: [
          {
            event_field_id: 'event-field-1',
            field_type: 'boolean',
            field_key: 'needs_help',
            label: 'Needs Help',
            answer_text: 'true',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'attendance-field-1',
            field_type: 'text',
            field_key: 'arrival_note',
            label: 'Arrival Note',
            answer_text: 'Arrived',
            answer_number: null,
          },
        ],
      });
      assertEquals(results[1].attendee_kind, 'public');
      assertEquals(results[1].public_registration_id, PUBLIC_ID);
      assertEquals(results[1].member_id, 'Guest');
      assertEquals(results[1].check_in_status, 'checked_in');
      assertEquals(
        fetchMock.requests.filter((url) =>
          ['/rest/v1/registrations', '/rest/v1/public_registrations'].includes(url.pathname),
        ).length,
        2,
      );
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('list-attendees maps registration lookup failures to an error response', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ errors: new Set(['registrations']) });
    try {
      const response = await handleListAttendees(buildRequest({ event_id: EVENT_ID }));

      assertEquals(response.status, 500);
      assertEquals((await response.json()).error_code, 'REGISTRATION_FETCH_FAILED');
    } finally {
      fetchMock.restore();
    }
  });
});
