import { assertEquals } from '@std/assert';

import { handleSubmitPublicRegistration } from '../handler.ts';

const ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const REGISTRATION_ID = '22222222-2222-4222-8222-222222222222';
let requestNumber = 0;

async function withEnv(run: () => Promise<void>) {
  const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', ORIGIN);
  try {
    await run();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function request(body: unknown) {
  return new Request('https://example.functions/submit-public-registration', {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

function payload(responses: Record<string, unknown> = {}) {
  return {
    event_slug: 'gathering',
    attendee: { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
    responses,
    idempotency_key: 'attempt-1',
  };
}

type Event = {
  id: string;
  duplicate_policy: string;
  allow_public_registrations: boolean;
  registration_mode: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
};
const EVENT: Event = {
  id: EVENT_ID,
  duplicate_policy: 'allow_multiple',
  allow_public_registrations: true,
  registration_mode: 'open',
  registration_opens_at: null,
  registration_closes_at: null,
};
const FIELD = {
  id: 'field-1',
  field_key: 'note',
  label: 'Note',
  field_type: 'text',
  applicability: 'guests',
  is_required: true,
  options: [],
  validation_rules: {},
};

function mockFetch(
  options: {
    event?: Event | null;
    fields?: unknown[];
    existing?: unknown;
    failPath?: string;
    failInsert?: string;
  } = {},
) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; url: URL; method: string; body: unknown }> = [];
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = init?.method ?? 'GET';
    calls.push({
      path: url.pathname,
      url,
      method,
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : null,
    });
    if (url.pathname === options.failPath)
      return Promise.resolve(Response.json({ message: 'database failed' }, { status: 500 }));
    if (url.pathname === options.failInsert && method === 'POST')
      return Promise.resolve(Response.json({ message: 'insert failed' }, { status: 500 }));
    if (url.pathname === '/rest/v1/events')
      return Promise.resolve(Response.json(options.event === undefined ? EVENT : options.event));
    if (url.pathname === '/rest/v1/event_fields')
      return Promise.resolve(Response.json(options.fields ?? []));
    if (url.pathname === '/rest/v1/public_registrations') {
      if (method === 'POST') return Promise.resolve(Response.json({ id: REGISTRATION_ID }));
      return Promise.resolve(Response.json(options.existing ?? null));
    }
    if (url.pathname === '/rest/v1/public_registration_answers')
      return Promise.resolve(new Response(null, { status: 201 }));
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test(
  'submit-public-registration rejects invalid attendee details before querying',
  async () => {
    await withEnv(async () => {
      const fetchMock = mockFetch();
      try {
        const response = await handleSubmitPublicRegistration(
          request({ ...payload(), attendee: { email: 'bad' } }),
        );
        assertEquals(response.status, 400);
        assertEquals((await response.json()).error_code, 'INVALID_REQUEST');
        assertEquals(fetchMock.calls, []);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'submit-public-registration enforces published event and public registration gates',
  async () => {
    await withEnv(async () => {
      for (const [event, errorCode] of [
        [null, 'EVENT_NOT_FOUND'],
        [{ ...EVENT, allow_public_registrations: false }, 'PUBLIC_REGISTRATION_NOT_ALLOWED'],
        [{ ...EVENT, registration_mode: 'closed' }, 'REGISTRATION_CLOSED'],
      ] as const) {
        const fetchMock = mockFetch({ event });
        try {
          const response = await handleSubmitPublicRegistration(request(payload()));
          assertEquals((await response.json()).error_code, errorCode);
          assertEquals(
            fetchMock.calls.some((call) => call.path === '/rest/v1/public_registrations'),
            false,
          );
        } finally {
          fetchMock.restore();
        }
      }
    });
  },
);

Deno.test('submit-public-registration blocks duplicate email registrations', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch({
      event: { ...EVENT, duplicate_policy: 'block' },
      existing: { id: REGISTRATION_ID },
    });
    try {
      const response = await handleSubmitPublicRegistration(request(payload()));
      assertEquals((await response.json()).error_code, 'DUPLICATE_REGISTRATION');
      const lookup = fetchMock.calls.find((call) => call.path === '/rest/v1/public_registrations');
      assertEquals(lookup?.url.searchParams.get('email'), 'ilike.ada@example.com');
      assertEquals(
        fetchMock.calls.some((call) => call.method === 'POST'),
        false,
      );
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('submit-public-registration inserts a new guest registration and answers', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch({ fields: [FIELD] });
    try {
      const response = await handleSubmitPublicRegistration(request(payload({ note: 'Hello' })));
      assertEquals(response.status, 200);
      assertEquals(await response.json(), {
        success: true,
        registration_id: REGISTRATION_ID,
        status: 'submitted',
        is_new: true,
        message: 'Registration submitted successfully',
      });
      const insert = fetchMock.calls.find((call) => call.path === '/rest/v1/public_registrations');
      assertEquals(
        (insert?.body as { registration_scope_key: string }).registration_scope_key,
        'attempt-1',
      );
      const answers = fetchMock.calls.find(
        (call) => call.path === '/rest/v1/public_registration_answers',
      );
      assertEquals(answers?.body, [
        {
          public_registration_id: REGISTRATION_ID,
          event_field_id: 'field-1',
          answer_text: 'Hello',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
        },
      ]);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('submit-public-registration maps failed event lookups without writing', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch({ failPath: '/rest/v1/events' });
    try {
      const response = await handleSubmitPublicRegistration(request(payload()));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error_code, 'EVENT_LOOKUP_FAILED');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'submit-public-registration reports registration and answer insertion failures',
  async () => {
    await withEnv(async () => {
      for (const [failInsert, errorCode] of [
        ['/rest/v1/public_registrations', 'REGISTRATION_INSERT_FAILED'],
        ['/rest/v1/public_registration_answers', 'INSERT_ANSWERS_FAILED'],
      ] as const) {
        const fetchMock = mockFetch({ fields: [FIELD], failInsert });
        try {
          const response = await handleSubmitPublicRegistration(
            request(payload({ note: 'Hello' })),
          );
          assertEquals(response.status, 500);
          assertEquals((await response.json()).error_code, errorCode);
          if (failInsert.endsWith('public_registrations')) {
            assertEquals(
              fetchMock.calls.some((call) => call.path === '/rest/v1/public_registration_answers'),
              false,
            );
          }
        } finally {
          fetchMock.restore();
        }
      }
    });
  },
);
