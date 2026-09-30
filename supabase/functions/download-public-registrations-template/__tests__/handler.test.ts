import { assertEquals, assertStringIncludes } from '@std/assert';

import { handleDownloadPublicRegistrationsTemplate } from '../handler.ts';

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
  return new Request('https://example.functions/download-public-registrations-template', {
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
      return Promise.resolve(Response.json({ title: 'Guest Event' }));
    }
    if (requestUrl.pathname === '/rest/v1/event_fields') {
      if (options.fieldsError) {
        return Promise.resolve(Response.json({ message: 'fields unavailable' }, { status: 500 }));
      }
      return Promise.resolve(
        Response.json([{ id: 'field-diet', field_key: 'diet', display_order: 1 }]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/public_registrations') {
      if (options.registrationsError) {
        return Promise.resolve(
          Response.json({ message: 'registrations unavailable' }, { status: 500 }),
        );
      }
      return Promise.resolve(
        Response.json([
          {
            id: REGISTRATION_ID,
            first_name: 'Alex, Jr.',
            last_name: 'Guest',
            nickname: null,
            email: 'alex@example.com',
            phone: '09170000000',
          },
        ]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/public_registration_answers') {
      return Promise.resolve(
        Response.json([
          {
            public_registration_id: REGISTRATION_ID,
            event_field_id: 'field-diet',
            answer_text: null,
            answer_number: null,
            answer_boolean: null,
            answer_date: null,
            answer_json: ['Vegetarian', 'No nuts'],
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
  'download-public-registrations-template validates event_id and requires an admin token',
  async () => {
    await withFunctionEnv(async () => {
      const invalidResponse = await handleDownloadPublicRegistrationsTemplate(
        buildRequest({ event_id: 'bad' }),
      );
      const unauthorizedResponse = await handleDownloadPublicRegistrationsTemplate(
        buildRequest({ event_id: EVENT_ID }, false),
      );
      assertEquals(invalidResponse.status, 400);
      assertEquals(unauthorizedResponse.status, 401);
    });
  },
);

Deno.test('download-public-registrations-template returns public registration CSV', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({});
    try {
      const response = await handleDownloadPublicRegistrationsTemplate(
        buildRequest({ event_id: EVENT_ID }),
      );
      const csv = await response.text();
      assertEquals(response.status, 200);
      assertEquals(response.headers.get('content-type'), 'text/csv; charset=utf-8');
      assertStringIncludes(
        response.headers.get('content-disposition') ?? '',
        'guest-event-public-registrations-template-',
      );
      assertEquals(
        csv.split('\n')[0],
        'public_registration_id,first_name,last_name,nickname,email,phone,diet',
      );
      assertStringIncludes(csv, '"Alex, Jr."');
      assertStringIncludes(csv, 'Vegetarian|No nuts');
      const fieldsUrl = fetchMock.requestedUrls.find(
        (url) => url.pathname === '/rest/v1/event_fields',
      );
      assertEquals(fieldsUrl?.searchParams.get('applicability'), 'in.(guests,both)');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('download-public-registrations-template reports field lookup errors', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ fieldsError: true });
    try {
      const response = await handleDownloadPublicRegistrationsTemplate(
        buildRequest({ event_id: EVENT_ID }),
      );
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to read registration fields');
      assertEquals(
        fetchMock.requestedUrls.some((url) => url.pathname === '/rest/v1/public_registrations'),
        false,
      );
    } finally {
      fetchMock.restore();
    }
  });
});
