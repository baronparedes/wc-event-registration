import { assertEquals } from '@std/assert';

import { handleCancelPublicRegistration } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const REGISTRATION_ID = '11111111-1111-4111-8111-111111111111';
const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const EMAIL = 'attendee@example.com';

async function withFunctionEnv(run: () => Promise<void>) {
  const previousValues = new Map<string, string | undefined>(
    ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'].map((name) => [
      name,
      Deno.env.get(name),
    ]),
  );

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

  return new Request('https://example.functions/cancel-public-registration', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: {
  registration: { id: string; status: string; email: string; event_id: string } | null;
  updateStatus?: number;
}) {
  const originalFetch = globalThis.fetch;
  const updates: unknown[] = [];
  const audits: Array<Record<string, unknown>> = [];

  globalThis.fetch = (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());

    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: crypto.randomUUID() }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-record', role: 'admin' }));
    }
    if (requestUrl.pathname === '/rest/v1/public_registrations' && init?.method === 'PATCH') {
      updates.push(JSON.parse(String(init.body)) as unknown);
      return Promise.resolve(new Response(null, { status: options.updateStatus ?? 204 }));
    }
    if (requestUrl.pathname === '/rest/v1/public_registrations') {
      return options.registration
        ? Promise.resolve(Response.json(options.registration))
        : Promise.resolve(Response.json({ code: 'PGRST116' }, { status: 406 }));
    }
    if (requestUrl.pathname === '/rest/v1/admin_audit_logs') {
      audits.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return Promise.resolve(new Response(null, { status: 201 }));
    }

    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    updates,
    audits,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test(
  'cancel-public-registration validates the request and requires an admin token',
  async () => {
    await withFunctionEnv(async () => {
      const invalidResponse = await handleCancelPublicRegistration(
        buildRequest({ registration_id: 'bad' }),
      );
      const unauthorizedResponse = await handleCancelPublicRegistration(
        buildRequest({ registration_id: REGISTRATION_ID }, false),
      );

      assertEquals(invalidResponse.status, 400);
      assertEquals(unauthorizedResponse.status, 401);
    });
  },
);

Deno.test(
  'cancel-public-registration returns not found when the registration does not exist',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({ registration: null });
      try {
        const response = await handleCancelPublicRegistration(
          buildRequest({ registration_id: REGISTRATION_ID }),
        );

        assertEquals(response.status, 404);
        assertEquals((await response.json()).error_code, 'NOT_FOUND');
        assertEquals(fetchMock.updates, []);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'cancel-public-registration refuses to cancel an already-cancelled registration',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        registration: {
          id: REGISTRATION_ID,
          status: 'cancelled',
          email: EMAIL,
          event_id: EVENT_ID,
        },
      });
      try {
        const response = await handleCancelPublicRegistration(
          buildRequest({ registration_id: REGISTRATION_ID }),
        );

        assertEquals(response.status, 400);
        assertEquals((await response.json()).error_code, 'ALREADY_CANCELLED');
        assertEquals(fetchMock.updates, []);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('cancel-public-registration reports a database update failure', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      registration: {
        id: REGISTRATION_ID,
        status: 'submitted',
        email: EMAIL,
        event_id: EVENT_ID,
      },
      updateStatus: 500,
    });
    try {
      const response = await handleCancelPublicRegistration(
        buildRequest({ registration_id: REGISTRATION_ID }),
      );

      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to cancel registration');
      assertEquals(fetchMock.audits, []);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('cancel-public-registration updates status and records the audit metadata', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      registration: {
        id: REGISTRATION_ID,
        status: 'submitted',
        email: EMAIL,
        event_id: EVENT_ID,
      },
    });
    try {
      const response = await handleCancelPublicRegistration(
        buildRequest({ registration_id: REGISTRATION_ID, reason: '  Duplicate entry  ' }),
      );
      const audit = fetchMock.audits[0];

      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true, registration_id: REGISTRATION_ID });
      assertEquals(fetchMock.updates, [{ status: 'cancelled' }]);
      assertEquals(audit.action, 'cancel_registration');
      assertEquals(audit.metadata, {
        email: EMAIL,
        event_id: EVENT_ID,
        previous_status: 'submitted',
        next_status: 'cancelled',
        source: 'public_registration',
        reason: 'Duplicate entry',
      });
    } finally {
      fetchMock.restore();
    }
  });
});
