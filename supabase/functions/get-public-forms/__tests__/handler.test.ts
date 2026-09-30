import { assertEquals } from '@std/assert';

import { handleGetPublicForms } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';

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

function buildRequest() {
  return new Request('https://example.functions/get-public-forms', {
    method: 'POST',
    headers: {
      origin: TEST_ORIGIN,
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
    },
    body: '{}',
  });
}

function mockFetch(options: { forms?: unknown[]; error?: boolean }) {
  const originalFetch = globalThis.fetch;
  let requestUrl: URL | null = null;
  globalThis.fetch = (input) => {
    requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    if (requestUrl.pathname !== '/rest/v1/forms') {
      return Promise.resolve(new Response('Unexpected request', { status: 500 }));
    }
    if (options.error) {
      return Promise.resolve(Response.json({ message: 'forms query failed' }, { status: 500 }));
    }
    return Promise.resolve(Response.json(options.forms ?? []));
  };
  return {
    requestUrl: () => requestUrl,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('get-public-forms returns published forms ordered by creation time', async () => {
  await withFunctionEnv(async () => {
    const forms = [{ id: 'form-1', slug: 'public-survey' }];
    const fetchMock = mockFetch({ forms });
    try {
      const response = await handleGetPublicForms(buildRequest());
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true, forms });
      assertEquals(fetchMock.requestUrl()?.searchParams.get('status'), 'eq.published');
      assertEquals(fetchMock.requestUrl()?.searchParams.get('order'), 'created_at.desc');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('get-public-forms returns an empty list when no forms are published', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ forms: [] });
    try {
      const response = await handleGetPublicForms(buildRequest());
      assertEquals(await response.json(), { success: true, forms: [] });
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('get-public-forms maps query errors to a server error', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ error: true });
    try {
      const response = await handleGetPublicForms(buildRequest());
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to fetch form listing');
    } finally {
      fetchMock.restore();
    }
  });
});
