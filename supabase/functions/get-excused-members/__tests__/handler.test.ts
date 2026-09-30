import { assertEquals } from '@std/assert';

import { handleGetExcusedMembers } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';

async function withFunctionEnv(run: () => Promise<void>) {
  const names = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ALLOWED_ORIGINS',
    'EXCUSE_REQUEST_EVENT_ID',
  ];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', TEST_ORIGIN);
  Deno.env.set('EXCUSE_REQUEST_EVENT_ID', EVENT_ID);
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
  return new Request('https://example.functions/get-excused-members', {
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

function mockFetch(options: {
  dateAnswers?: unknown[];
  registrations?: unknown[];
  dateError?: boolean;
}) {
  const originalFetch = globalThis.fetch;
  const requestedUrls: URL[] = [];

  globalThis.fetch = (input) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    requestedUrls.push(requestUrl);
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: crypto.randomUUID() }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: 'slod' }));
    }
    if (requestUrl.pathname === '/rest/v1/registration_answers') {
      if (options.dateError) {
        return Promise.resolve(
          Response.json({ message: 'date answer lookup failed' }, { status: 500 }),
        );
      }
      return Promise.resolve(Response.json(options.dateAnswers ?? []));
    }
    if (requestUrl.pathname === '/rest/v1/registrations') {
      return Promise.resolve(Response.json(options.registrations ?? []));
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    requestedUrls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('get-excused-members validates year and month index', async () => {
  await withFunctionEnv(async () => {
    const response = await handleGetExcusedMembers(buildRequest({ year: 1999, monthIndex: 12 }));
    assertEquals(response.status, 400);
  });
});

Deno.test(
  'get-excused-members filters the requested month and normalizes answer values',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        dateAnswers: [{ registration_id: 'registration-1' }],
        registrations: [
          {
            id: 'registration-1',
            users: { id: 'user-1', member_id: 'M-001' },
            registration_answers: [
              {
                answer_text: null,
                answer_number: null,
                answer_boolean: null,
                answer_date: '2026-02-08T00:00:00.000Z',
                answer_json: null,
                event_fields: { field_key: 'request_date' },
              },
              {
                answer_text: '["9AM", "12NN"]',
                answer_number: null,
                answer_boolean: null,
                answer_date: null,
                answer_json: null,
                event_fields: [{ field_key: 'services' }],
              },
              {
                answer_text: 'Family commitment',
                answer_number: null,
                answer_boolean: null,
                answer_date: null,
                answer_json: null,
                event_fields: { field_key: 'reason' },
              },
            ],
          },
        ],
      });
      try {
        const response = await handleGetExcusedMembers(buildRequest({ year: 2026, monthIndex: 1 }));
        assertEquals(await response.json(), {
          success: true,
          records: [
            {
              userId: 'user-1',
              memberId: 'M-001',
              requestDate: '2026-02-08',
              services: '9AM, 12NN',
              reason: 'Family commitment',
            },
          ],
        });
        const dateQuery = fetchMock.requestedUrls.find(
          (url) => url.pathname === '/rest/v1/registration_answers',
        );
        assertEquals(
          dateQuery?.searchParams.get('or'),
          '(and(answer_date.gte.2026-02-01,answer_date.lte.2026-02-28),answer_text.ilike.%2026-02%)',
        );
        assertEquals(dateQuery?.searchParams.get('registrations.event_id'), `eq.${EVENT_ID}`);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'get-excused-members returns an empty list without a second query when no requests match',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({ dateAnswers: [] });
      try {
        const response = await handleGetExcusedMembers(buildRequest({ year: 2026, monthIndex: 1 }));
        assertEquals(await response.json(), { success: true, records: [] });
        assertEquals(
          fetchMock.requestedUrls.some((url) => url.pathname === '/rest/v1/registrations'),
          false,
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('get-excused-members maps date-answer query failures', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ dateError: true });
    try {
      const response = await handleGetExcusedMembers(buildRequest({ year: 2026, monthIndex: 1 }));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to query matching excused requests');
    } finally {
      fetchMock.restore();
    }
  });
});
