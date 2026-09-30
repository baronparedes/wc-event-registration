import { assertEquals } from '@std/assert';

import { handleSubmitFormSubmission } from '../handler.ts';

const ORIGIN = 'https://app.example.com';
const FORM_ID = '11111111-1111-4111-8111-111111111111';
const FIELD_ID = '22222222-2222-4222-8222-222222222222';
const SUBMISSION_ID = '33333333-3333-4333-8333-333333333333';
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
  return new Request('https://example.functions/submit-form-submission', {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

function payload(responses: Record<string, unknown> = { note: 'Hello' }) {
  return {
    form_slug: 'feedback',
    responses,
    idempotency_key: 'request-1',
    public_registrant_info: { email: 'guest@example.com' },
  };
}

const FIELD = {
  id: FIELD_ID,
  field_key: 'note',
  label: 'Note',
  field_type: 'text',
  field_applicability: 'all',
  is_required: true,
  options: [],
  validation_rules: {},
};

function mockFetch(
  options: {
    form?: unknown;
    fields?: unknown[];
    user?: unknown;
    existing?: unknown;
    failPath?: string;
  } = {},
) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; url: URL; body: unknown; method: string }> = [];
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
      return Promise.resolve(Response.json({ message: 'write failed' }, { status: 500 }));
    if (url.pathname === '/rest/v1/forms')
      return Promise.resolve(
        Response.json(
          options.form === undefined
            ? {
                id: FORM_ID,
                duplicate_policy: 'allow_multiple',
                audience: 'public',
                status: 'published',
              }
            : options.form,
        ),
      );
    if (url.pathname === '/rest/v1/users')
      return Promise.resolve(Response.json(options.user ?? { id: 'member-1' }));
    if (url.pathname === '/rest/v1/form_fields')
      return Promise.resolve(Response.json(options.fields ?? [FIELD]));
    if (url.pathname === '/rest/v1/form_submissions' && method === 'GET')
      return Promise.resolve(Response.json(options.existing ?? null));
    if (url.pathname === '/rest/v1/form_submissions' && method === 'POST')
      return Promise.resolve(Response.json({ id: SUBMISSION_ID }));
    if (url.pathname === '/rest/v1/form_submission_answers' && method === 'POST')
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
  'submit-form-submission rejects missing idempotency keys without database access',
  async () => {
    await withEnv(async () => {
      const fetchMock = mockFetch();
      try {
        const response = await handleSubmitFormSubmission(
          request({ ...payload(), idempotency_key: '' }),
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

Deno.test('submit-form-submission rejects missing and failed form lookups', async () => {
  await withEnv(async () => {
    for (const options of [{ form: null }, { failPath: '/rest/v1/forms' }]) {
      const fetchMock = mockFetch(options);
      try {
        const response = await handleSubmitFormSubmission(request(payload()));
        assertEquals(
          (await response.json()).error_code,
          options.form === null ? 'FORM_NOT_FOUND' : 'FORM_LOOKUP_FAILED',
        );
        assertEquals(
          fetchMock.calls.some((call) => call.path === '/rest/v1/form_submissions'),
          false,
        );
      } finally {
        fetchMock.restore();
      }
    }
  });
});

Deno.test(
  'submit-form-submission validates required fields before creating a submission',
  async () => {
    await withEnv(async () => {
      const fetchMock = mockFetch();
      try {
        const response = await handleSubmitFormSubmission(request(payload({})));
        assertEquals(response.status, 200);
        assertEquals((await response.json()).error_code, 'VALIDATION_FAILED');
        assertEquals(
          fetchMock.calls.some((call) => call.path === '/rest/v1/form_submissions'),
          false,
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('submit-form-submission creates a public submission and saves its answers', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch();
    try {
      const response = await handleSubmitFormSubmission(request(payload()));
      assertEquals(response.status, 200);
      assertEquals(await response.json(), {
        success: true,
        submission_id: SUBMISSION_ID,
        status: 'submitted',
        is_new: true,
        message: 'Form submitted successfully',
      });
      const insert = fetchMock.calls.find((call) => call.path === '/rest/v1/form_submissions');
      assertEquals(insert?.body, {
        form_id: FORM_ID,
        user_id: null,
        public_registrant_info: { email: 'guest@example.com' },
        idempotency_key: 'request-1',
        status: 'submitted',
        source: 'public',
      });
      const answers = fetchMock.calls.find(
        (call) => call.path === '/rest/v1/form_submission_answers',
      );
      assertEquals(answers?.body, [
        { submission_id: SUBMISSION_ID, form_field_id: FIELD_ID, answer_text: 'Hello' },
      ]);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('submit-form-submission reports answer insert errors', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch({ failPath: '/rest/v1/form_submission_answers' });
    try {
      const response = await handleSubmitFormSubmission(request(payload()));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error_code, 'ANSWERS_INSERT_FAILED');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'submit-form-submission blocks duplicate member submissions before insertion',
  async () => {
    await withEnv(async () => {
      const fetchMock = mockFetch({
        form: { id: FORM_ID, duplicate_policy: 'block', audience: 'members', status: 'published' },
        existing: { id: SUBMISSION_ID },
      });
      try {
        const response = await handleSubmitFormSubmission(
          request({ ...payload(), member_id: 'M-123' }),
        );
        assertEquals((await response.json()).error_code, 'duplicate_blocked');
        const memberLookup = fetchMock.calls.find((call) => call.path === '/rest/v1/users');
        assertEquals(memberLookup?.url.searchParams.get('member_id'), 'eq.M-123');
        assertEquals(
          fetchMock.calls.some(
            (call) => call.path === '/rest/v1/form_submissions' && call.method === 'POST',
          ),
          false,
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);
