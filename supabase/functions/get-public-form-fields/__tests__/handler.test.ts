import { assertEquals } from '@std/assert';

import { handleGetPublicFormFields } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const FORM_ID = '11111111-1111-4111-8111-111111111111';

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
  return new Request('https://example.functions/get-public-form-fields', {
    method: 'POST',
    headers: {
      origin: TEST_ORIGIN,
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { form?: unknown; fieldError?: boolean }) {
  const originalFetch = globalThis.fetch;
  const requestedUrls: URL[] = [];
  globalThis.fetch = (input) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    requestedUrls.push(requestUrl);
    if (requestUrl.pathname === '/rest/v1/forms') {
      return Promise.resolve(
        Response.json(options.form === undefined ? { id: FORM_ID } : options.form),
      );
    }
    if (requestUrl.pathname === '/rest/v1/form_fields') {
      if (options.fieldError) {
        return Promise.resolve(Response.json({ message: 'fields query failed' }, { status: 500 }));
      }
      return Promise.resolve(Response.json([{ id: 'field-1', field_key: 'availability' }]));
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

Deno.test('get-public-form-fields validates the form UUID', async () => {
  await withFunctionEnv(async () => {
    const response = await handleGetPublicFormFields(buildRequest({ form_id: 'bad' }));
    assertEquals(response.status, 400);
  });
});

Deno.test(
  'get-public-form-fields returns empty for unpublished forms without querying fields',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({ form: null });
      try {
        const response = await handleGetPublicFormFields(buildRequest({ form_id: FORM_ID }));
        assertEquals(await response.json(), { success: true, fields: [] });
        assertEquals(fetchMock.requestedUrls.length, 1);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('get-public-form-fields applies the public audience filter', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({});
    try {
      const response = await handleGetPublicFormFields(
        buildRequest({ form_id: FORM_ID, audience: 'public' }),
      );
      assertEquals(await response.json(), {
        success: true,
        fields: [{ id: 'field-1', field_key: 'availability' }],
      });
      const fieldsUrl = fetchMock.requestedUrls.find(
        (url) => url.pathname === '/rest/v1/form_fields',
      );
      assertEquals(fieldsUrl?.searchParams.get('field_applicability'), 'in.(all,public_only)');
      assertEquals(fieldsUrl?.searchParams.get('is_active'), 'eq.true');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('get-public-form-fields maps field query failures', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ fieldError: true });
    try {
      const response = await handleGetPublicFormFields(buildRequest({ form_id: FORM_ID }));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to fetch form fields');
    } finally {
      fetchMock.restore();
    }
  });
});
