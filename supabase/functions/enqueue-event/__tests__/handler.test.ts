import { assertEquals } from '@std/assert';

import { handleEnqueueEvent } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const SERVICE_ROLE_KEY = 'test-service-role-key';

async function withFunctionEnv(run: () => Promise<void>) {
  const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
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

function buildRequest(body: unknown, authorized = true) {
  const headers = new Headers({ origin: TEST_ORIGIN, 'content-type': 'application/json' });
  if (authorized) headers.set('authorization', `Bearer ${SERVICE_ROLE_KEY}`);
  return new Request('https://example.functions/enqueue-event', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    event_type: 'registration_confirmation',
    recipient: 'attendee@example.com',
    template_slug: 'registration-confirmed',
    metadata: { event_id: 'event-1' },
    idempotency_key: 'registration-1',
    ...overrides,
  };
}

function mockFetch(options: { enqueueError?: boolean; triggerError?: boolean } = {}) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; body: unknown }> = [];
  globalThis.fetch = (input, init) => {
    const path = new URL(input instanceof Request ? input.url : input.toString()).pathname;
    calls.push({ path, body: init?.body ? (JSON.parse(String(init.body)) as unknown) : null });
    if (path === '/rest/v1/rpc/enqueue_email_notification') {
      return Promise.resolve(
        options.enqueueError
          ? Response.json({ message: 'queue failed' }, { status: 500 })
          : Response.json(42),
      );
    }
    if (path === '/rest/v1/rpc/trigger_email_processor') {
      return Promise.resolve(
        options.triggerError
          ? Response.json({ message: 'trigger failed' }, { status: 500 })
          : Response.json(null),
      );
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

Deno.test('enqueue-event rejects missing content, metadata, and credentials', async () => {
  await withFunctionEnv(async () => {
    assertEquals(
      (await handleEnqueueEvent(buildRequest(payload({ template_slug: undefined })))).status,
      400,
    );
    assertEquals(
      (await handleEnqueueEvent(buildRequest(payload({ metadata: undefined })))).status,
      400,
    );
    assertEquals((await handleEnqueueEvent(buildRequest(payload(), false))).status, 401);
  });
});

Deno.test('enqueue-event submits the payload and triggers email processing', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch();
    try {
      const response = await handleEnqueueEvent(buildRequest(payload()));
      assertEquals(response.status, 201);
      assertEquals(await response.json(), { success: true, message_id: 42 });
      assertEquals(fetchMock.calls, [
        {
          path: '/rest/v1/rpc/enqueue_email_notification',
          body: { payload: payload() },
        },
        { path: '/rest/v1/rpc/trigger_email_processor', body: {} },
      ]);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('enqueue-event does not trigger processing when queue insertion fails', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ enqueueError: true });
    try {
      const response = await handleEnqueueEvent(buildRequest(payload({ text: 'Hello' })));
      assertEquals(response.status, 500);
      assertEquals(
        fetchMock.calls.map((call) => call.path),
        ['/rest/v1/rpc/enqueue_email_notification'],
      );
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('enqueue-event succeeds when the processor trigger fails', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ triggerError: true });
    try {
      const response = await handleEnqueueEvent(
        buildRequest(payload({ template_slug: undefined, text: 'Hello' })),
      );
      assertEquals(response.status, 201);
      assertEquals(await response.json(), { success: true, message_id: 42 });
      assertEquals(fetchMock.calls.length, 2);
    } finally {
      fetchMock.restore();
    }
  });
});
