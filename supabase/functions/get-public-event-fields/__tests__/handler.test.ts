import { assertEquals } from '@std/assert';

import { handleGetPublicEventFields } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';

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
  return new Request('https://example.functions/get-public-event-fields', {
    method: 'POST',
    headers: {
      origin: TEST_ORIGIN,
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { event?: unknown; eventError?: boolean; fieldError?: boolean }) {
  const originalFetch = globalThis.fetch;
  const requestedUrls: URL[] = [];
  globalThis.fetch = (input) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    requestedUrls.push(requestUrl);
    if (requestUrl.pathname === '/rest/v1/events') {
      if (options.eventError) {
        return Promise.resolve(Response.json({ message: 'event read failed' }, { status: 500 }));
      }
      return Promise.resolve(
        Response.json(options.event === undefined ? { id: EVENT_ID } : options.event),
      );
    }
    if (requestUrl.pathname === '/rest/v1/event_fields') {
      if (options.fieldError) {
        return Promise.resolve(Response.json({ message: 'fields read failed' }, { status: 500 }));
      }
      return Promise.resolve(Response.json([{ id: 'field-1', field_key: 'diet' }]));
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

Deno.test('get-public-event-fields validates the event UUID', async () => {
  await withFunctionEnv(async () => {
    const response = await handleGetPublicEventFields(buildRequest({ event_id: 'bad' }));
    assertEquals(response.status, 400);
  });
});

Deno.test('get-public-event-fields returns no fields for an unpublished event', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ event: null });
    try {
      const response = await handleGetPublicEventFields(buildRequest({ event_id: EVENT_ID }));
      assertEquals(await response.json(), { success: true, fields: [] });
      assertEquals(fetchMock.requestedUrls.length, 1);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('get-public-event-fields filters fields by requested audience', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({});
    try {
      const response = await handleGetPublicEventFields(
        buildRequest({ event_id: EVENT_ID, audience: 'members' }),
      );
      assertEquals(await response.json(), {
        success: true,
        fields: [{ id: 'field-1', field_key: 'diet' }],
      });
      const fieldsUrl = fetchMock.requestedUrls.find(
        (url) => url.pathname === '/rest/v1/event_fields',
      );
      assertEquals(fieldsUrl?.searchParams.get('applicability'), 'in.(members,both)');
      assertEquals(fieldsUrl?.searchParams.get('is_active'), 'eq.true');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('get-public-event-fields maps field query failures', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ fieldError: true });
    try {
      const response = await handleGetPublicEventFields(buildRequest({ event_id: EVENT_ID }));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to fetch event fields');
    } finally {
      fetchMock.restore();
    }
  });
});
