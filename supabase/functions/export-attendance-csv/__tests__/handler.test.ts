import { assertEquals, assertStringIncludes } from '@std/assert';

import { handleExportAttendanceCsv } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';

async function withFunctionEnv(run: () => Promise<void>) {
  const envNames = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'];
  const previousValues = new Map(envNames.map((name) => [name, Deno.env.get(name)]));
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
  const headers = new Headers({ origin: TEST_ORIGIN, 'content-type': 'application/json' });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');
  return new Request('https://example.functions/export-attendance-csv', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { disabled?: boolean; settingsError?: boolean }) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: crypto.randomUUID() }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: 'slod' }));
    }
    if (requestUrl.pathname === '/rest/v1/events') {
      return Promise.resolve(Response.json({ title: 'Community Day' }));
    }
    if (requestUrl.pathname === '/rest/v1/attendance_settings') {
      if (options.settingsError) {
        return Promise.resolve(Response.json({ message: 'settings unavailable' }, { status: 500 }));
      }
      return Promise.resolve(Response.json({ attendance_enabled: !options.disabled }));
    }
    if (requestUrl.pathname === '/rest/v1/attendance_fields') {
      return Promise.resolve(
        Response.json([
          {
            id: 'field-slot',
            field_key: 'service_slot',
            label: 'Service Slot',
            field_type: 'multi_select',
          },
        ]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/registrations') {
      return Promise.resolve(Response.json([{ id: 'member-reg', user_id: 'member-user' }]));
    }
    if (requestUrl.pathname === '/rest/v1/users') {
      return Promise.resolve(
        Response.json([
          {
            id: 'member-user',
            member_id: 'M-001',
            full_name: 'Alex Member',
            email: 'alex@example.com',
          },
        ]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/public_registrations') {
      return Promise.resolve(
        Response.json([
          { id: 'public-reg', first_name: 'Sam', last_name: 'Guest', email: 'sam@example.com' },
        ]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/attendance_check_ins') {
      return Promise.resolve(
        Response.json([
          {
            attendee_kind: 'registered',
            registration_id: 'member-reg',
            public_registration_id: null,
            first_checked_in_at: '2026-09-29T01:00:00.000Z',
          },
        ]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/attendance_answers') {
      return Promise.resolve(
        Response.json([
          {
            registration_id: 'member-reg',
            attendance_field_id: 'field-slot',
            answer_text: '["9AM","12NN"]',
            answer_number: null,
          },
        ]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/public_attendance_answers') {
      return Promise.resolve(
        Response.json([
          {
            public_registration_id: 'public-reg',
            attendance_field_id: 'field-slot',
            answer_text: null,
            answer_number: 3,
          },
        ]),
      );
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('export-attendance-csv validates event_id and requires an authorized user', async () => {
  await withFunctionEnv(async () => {
    const invalid = await handleExportAttendanceCsv(buildRequest({ event_id: 'bad' }));
    const unauthorized = await handleExportAttendanceCsv(
      buildRequest({ event_id: EVENT_ID }, false),
    );
    assertEquals(invalid.status, 400);
    assertEquals(unauthorized.status, 401);
  });
});

Deno.test('export-attendance-csv exports registered and public attendance rows', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({});
    try {
      const response = await handleExportAttendanceCsv(buildRequest({ event_id: EVENT_ID }));
      const csv = await response.text();
      const rows = csv.split('\n');
      assertEquals(response.status, 200);
      assertEquals(response.headers.get('content-type'), 'text/csv; charset=utf-8');
      assertStringIncludes(
        response.headers.get('content-disposition') ?? '',
        'community-day-attendance-',
      );
      assertEquals(
        rows[0],
        'attendee_kind,registration_id,public_registration_id,member_id,full_name,email,status,official_check_in_time,Service Slot',
      );
      assertStringIncludes(
        rows[1],
        'registered,member-reg,,M-001,Alex Member,alex@example.com,checked_in,2026-09-29T01:00:00.000Z,9AM; 12NN',
      );
      assertStringIncludes(
        rows[2],
        'public,,public-reg,,Sam Guest,sam@example.com,not_checked_in,,3',
      );
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('export-attendance-csv rejects events with disabled attendance', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ disabled: true });
    try {
      const response = await handleExportAttendanceCsv(buildRequest({ event_id: EVENT_ID }));
      assertEquals(response.status, 400);
      assertEquals((await response.json()).error, 'Attendance tracking is disabled for this event');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('export-attendance-csv maps attendance settings query failures', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ settingsError: true });
    try {
      const response = await handleExportAttendanceCsv(buildRequest({ event_id: EVENT_ID }));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to read attendance settings');
    } finally {
      fetchMock.restore();
    }
  });
});
