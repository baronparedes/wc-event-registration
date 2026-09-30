import { assertEquals, assertStringIncludes } from '@std/assert';

import { handleDownloadRegistrationsTemplate } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const ADMIN_USER_ID = '11111111-1111-4111-8111-111111111111';
const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const REGISTRATION_ID = '33333333-3333-4333-8333-333333333333';

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
  return new Request('https://example.functions/download-registrations-template', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { fieldsError?: boolean; registrationsError?: boolean }) {
  const originalFetch = globalThis.fetch;
  const requestedUrls: URL[] = [];

  globalThis.fetch = (input) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    requestedUrls.push(requestUrl);
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: ADMIN_USER_ID }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: 'admin' }));
    }
    if (requestUrl.pathname === '/rest/v1/events') {
      return Promise.resolve(Response.json({ title: 'Member Event' }));
    }
    if (requestUrl.pathname === '/rest/v1/event_fields') {
      if (options.fieldsError) {
        return Promise.resolve(Response.json({ message: 'fields unavailable' }, { status: 500 }));
      }
      return Promise.resolve(
        Response.json([{ id: 'field-meal', field_key: 'meal_choice', display_order: 1 }]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/users') {
      return Promise.resolve(
        Response.json([
          {
            id: 'user-1',
            member_id: 'MEM-001',
            full_name: 'Alex, Member',
            email: 'alex@example.com',
            phone: '09170000000',
            role: 'attendee',
            category: 'member',
          },
          {
            id: 'user-2',
            member_id: 'MEM-002',
            full_name: 'Casey Member',
            email: 'casey@example.com',
            phone: null,
            role: null,
            category: null,
          },
        ]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/registrations') {
      if (options.registrationsError) {
        return Promise.resolve(
          Response.json({ message: 'registrations unavailable' }, { status: 500 }),
        );
      }
      return Promise.resolve(Response.json([{ id: REGISTRATION_ID, user_id: 'user-1' }]));
    }
    if (requestUrl.pathname === '/rest/v1/registration_answers') {
      return Promise.resolve(
        Response.json([
          {
            registration_id: REGISTRATION_ID,
            event_field_id: 'field-meal',
            answer_text: '["Vegetarian", "No nuts"]',
          },
          {
            registration_id: 'registration-from-another-event',
            event_field_id: 'field-meal',
            answer_text: 'must not leak',
          },
        ]),
      );
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

Deno.test(
  'download-registrations-template validates event_id and requires an admin token',
  async () => {
    await withFunctionEnv(async () => {
      const invalidResponse = await handleDownloadRegistrationsTemplate(
        buildRequest({ event_id: 'bad' }),
      );
      const unauthorizedResponse = await handleDownloadRegistrationsTemplate(
        buildRequest({ event_id: EVENT_ID }, false),
      );
      assertEquals(invalidResponse.status, 400);
      assertEquals(unauthorizedResponse.status, 401);
    });
  },
);

Deno.test(
  'download-registrations-template returns member rows and only event registration answers',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({});
      try {
        const response = await handleDownloadRegistrationsTemplate(
          buildRequest({ event_id: EVENT_ID }),
        );
        const csv = await response.text();
        assertEquals(response.status, 200);
        assertEquals(response.headers.get('content-type'), 'text/csv; charset=utf-8');
        assertStringIncludes(
          response.headers.get('content-disposition') ?? '',
          'member-event-registrations-template-',
        );
        assertEquals(
          csv.split('\n')[0],
          'registration_id,member_id,full_name,email,phone,role,category,meal_choice',
        );
        assertStringIncludes(
          csv,
          `${REGISTRATION_ID},MEM-001,"Alex, Member",alex@example.com,09170000000,attendee,member,Vegetarian|No nuts`,
        );
        assertStringIncludes(csv, ',MEM-002,Casey Member,casey@example.com,,,,');
        assertEquals(csv.includes('must not leak'), false);
        const answersUrl = fetchMock.requestedUrls.find(
          (url) => url.pathname === '/rest/v1/registration_answers',
        );
        assertEquals(answersUrl?.searchParams.has('registration_id'), false);
        assertEquals(answersUrl?.searchParams.get('event_field_id'), 'in.(field-meal)');
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('download-registrations-template reports field lookup errors', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ fieldsError: true });
    try {
      const response = await handleDownloadRegistrationsTemplate(
        buildRequest({ event_id: EVENT_ID }),
      );
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to read registration fields');
      assertEquals(
        fetchMock.requestedUrls.some((url) => url.pathname === '/rest/v1/users'),
        false,
      );
    } finally {
      fetchMock.restore();
    }
  });
});
