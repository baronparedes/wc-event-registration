import { assertEquals, assertStringIncludes } from '@std/assert';

import { handleDownloadAttendanceCsv } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const ADMIN_USER_ID = '11111111-1111-4111-8111-111111111111';
const EVENT_ID = '22222222-2222-4222-8222-222222222222';

const EVENT_CONTEXT = {
  title: 'Spring Event',
  attendance_fields: [
    {
      id: 'field-active',
      field_key: 'service_slot',
      field_type: 'multi_select',
      label: 'Service slot',
      is_active: true,
      display_order: 1,
    },
    {
      id: 'field-inactive',
      field_key: 'old_field',
      field_type: 'text',
      label: 'Old field',
      is_active: false,
      display_order: 2,
    },
  ],
};

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
  const headers = new Headers({
    origin: TEST_ORIGIN,
    'content-type': 'application/json',
  });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');

  return new Request('https://example.functions/download-attendance-csv', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: {
  eventContext?: typeof EVENT_CONTEXT | null;
  rpcData?: unknown;
  eventError?: boolean;
  rpcError?: boolean;
}) {
  const originalFetch = globalThis.fetch;
  const rpcCalls: Array<{ functionName: string; body: unknown }> = [];

  globalThis.fetch = (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());

    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: ADMIN_USER_ID }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: 'admin' }));
    }
    if (requestUrl.pathname === '/rest/v1/events') {
      if (options.eventError) {
        return Promise.resolve(Response.json({ message: 'event read failed' }, { status: 500 }));
      }
      return Promise.resolve(Response.json(options.eventContext ?? EVENT_CONTEXT));
    }
    if (requestUrl.pathname === '/rest/v1/rpc/list_event_attendees_v2') {
      rpcCalls.push({
        functionName: 'list_event_attendees_v2',
        body: JSON.parse(String(init?.body)) as unknown,
      });
      if (options.rpcError) {
        return Promise.resolve(Response.json({ message: 'attendee read failed' }, { status: 500 }));
      }
      return Promise.resolve(
        Response.json(options.rpcData ?? { attendance_enabled: true, results: [] }),
      );
    }

    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    rpcCalls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('download-attendance-csv validates event_id and requires an admin token', async () => {
  await withFunctionEnv(async () => {
    const invalidResponse = await handleDownloadAttendanceCsv(buildRequest({ event_id: 'bad' }));
    const unauthorizedResponse = await handleDownloadAttendanceCsv(
      buildRequest({ event_id: EVENT_ID }, false),
    );

    assertEquals(invalidResponse.status, 400);
    assertEquals(unauthorizedResponse.status, 401);
  });
});

Deno.test(
  'download-attendance-csv includes registered attendee data and active attendance fields',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        rpcData: {
          attendance_enabled: true,
          results: [
            {
              attendee_kind: 'registered',
              registration_id: 'registration-1',
              public_registration_id: null,
              member_id: 'MEM-001',
              avatar_object_key: null,
              nickname: 'Jamie',
              last_name: 'Lee',
              member_metadata: { team: 'North' },
              full_name: 'Lee, "Jamie"',
              email: 'jamie@example.com',
              role: 'attendee',
              category: 'member',
              submitted_at: '2026-09-20T01:02:03.000Z',
              attendance_answers: [
                {
                  attendance_field_id: 'field-active',
                  field_key: 'service_slot',
                  field_type: 'multi_select',
                  answer_text: '["9AM", "12NN"]',
                  answer_number: null,
                },
                {
                  attendance_field_id: 'field-inactive',
                  field_key: 'old_field',
                  field_type: 'text',
                  answer_text: 'hidden',
                  answer_number: null,
                },
              ],
              registration_answers: [
                { field_key: 'shirt_size', answer_text: 'M', answer_number: null },
              ],
            },
          ],
        },
      });
      try {
        const response = await handleDownloadAttendanceCsv(buildRequest({ event_id: EVENT_ID }));
        const csv = await response.text();
        assertEquals(response.status, 200);
        assertEquals(response.headers.get('content-type'), 'text/csv; charset=utf-8');
        assertStringIncludes(
          response.headers.get('content-disposition') ?? '',
          'spring-event-attendance-data-',
        );
        assertStringIncludes(csv.split('\n')[0], 'service_slot');
        assertEquals(csv.split('\n')[0].includes('old_field'), false);
        assertStringIncludes(csv, '"Lee, ""Jamie"""');
        assertStringIncludes(csv, '9AM|12NN');
        assertStringIncludes(csv, '"{""shirt_size"":""M""}"');
        assertEquals(fetchMock.rpcCalls, [
          { functionName: 'list_event_attendees_v2', body: { p_event_id: EVENT_ID } },
        ]);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('download-attendance-csv rejects events with attendance tracking disabled', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ rpcData: { attendance_enabled: false, results: [] } });
    try {
      const response = await handleDownloadAttendanceCsv(buildRequest({ event_id: EVENT_ID }));
      assertEquals(response.status, 400);
      assertEquals(
        (await response.json()).error,
        'Attendance tracking is disabled for this event.',
      );
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'download-attendance-csv returns an error when event context cannot be loaded',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({ eventError: true });
      try {
        const response = await handleDownloadAttendanceCsv(buildRequest({ event_id: EVENT_ID }));
        assertEquals(response.status, 500);
        assertEquals((await response.json()).error, 'Failed to read event attendance context');
      } finally {
        fetchMock.restore();
      }
    });
  },
);
