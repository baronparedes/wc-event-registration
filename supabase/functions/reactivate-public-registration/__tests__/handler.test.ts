import { assertEquals } from '@std/assert';

import { handleReactivatePublicRegistration } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const REGISTRATION_ID = '11111111-1111-4111-8111-111111111111';
const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const EMAIL = 'attendee@example.com';

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

function buildRequest(body: unknown, authenticated = true) {
  const headers = new Headers({ origin: TEST_ORIGIN, 'content-type': 'application/json' });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');
  return new Request('https://example.functions/reactivate-public-registration', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

type Registration = { id: string; status: string; email: string; event_id: string };

function mockFetch(options: {
  registration: Registration | null;
  updateStatus?: number;
  auditStatus?: number;
}) {
  const originalFetch = globalThis.fetch;
  const updates: unknown[] = [];
  const audits: Array<Record<string, unknown>> = [];
  const lookups: URL[] = [];
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: crypto.randomUUID() }));
    }
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-record', role: 'admin' }));
    }
    if (url.pathname === '/rest/v1/public_registrations' && init?.method === 'PATCH') {
      updates.push(JSON.parse(String(init.body)) as unknown);
      return Promise.resolve(new Response(null, { status: options.updateStatus ?? 204 }));
    }
    if (url.pathname === '/rest/v1/public_registrations') {
      lookups.push(url);
      return Promise.resolve(
        options.registration
          ? Response.json(options.registration)
          : Response.json({ code: 'PGRST116' }, { status: 406 }),
      );
    }
    if (url.pathname === '/rest/v1/admin_audit_logs') {
      audits.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return Promise.resolve(
        options.auditStatus === 500
          ? Response.json({ message: 'audit failed' }, { status: 500 })
          : new Response(null, { status: 201 }),
      );
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };
  return {
    updates,
    audits,
    lookups,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

function cancelledRegistration(): Registration {
  return { id: REGISTRATION_ID, status: 'cancelled', email: EMAIL, event_id: EVENT_ID };
}

Deno.test(
  'reactivate-public-registration rejects invalid IDs and unauthenticated requests',
  async () => {
    await withFunctionEnv(async () => {
      assertEquals(
        (await handleReactivatePublicRegistration(buildRequest({ registration_id: 'bad' }))).status,
        400,
      );
      assertEquals(
        (
          await handleReactivatePublicRegistration(
            buildRequest({ registration_id: REGISTRATION_ID }, false),
          )
        ).status,
        401,
      );
    });
  },
);

Deno.test('reactivate-public-registration returns not found without writing', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ registration: null });
    try {
      const response = await handleReactivatePublicRegistration(
        buildRequest({ registration_id: REGISTRATION_ID }),
      );
      assertEquals(response.status, 404);
      assertEquals((await response.json()).error_code, 'NOT_FOUND');
      assertEquals(fetchMock.updates, []);
      assertEquals(fetchMock.audits, []);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('reactivate-public-registration refuses active registrations', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      registration: { ...cancelledRegistration(), status: 'submitted' },
    });
    try {
      const response = await handleReactivatePublicRegistration(
        buildRequest({ registration_id: REGISTRATION_ID }),
      );
      assertEquals(response.status, 400);
      assertEquals((await response.json()).error_code, 'NOT_CANCELLED');
      assertEquals(fetchMock.updates, []);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('reactivate-public-registration does not audit failed updates', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ registration: cancelledRegistration(), updateStatus: 500 });
    try {
      const response = await handleReactivatePublicRegistration(
        buildRequest({ registration_id: REGISTRATION_ID }),
      );
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to reactivate registration');
      assertEquals(fetchMock.audits, []);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'reactivate-public-registration restores submitted status and audits the attendee',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({ registration: cancelledRegistration() });
      try {
        const response = await handleReactivatePublicRegistration(
          buildRequest({ registration_id: REGISTRATION_ID }),
        );
        assertEquals(response.status, 200);
        assertEquals(await response.json(), { success: true, registration_id: REGISTRATION_ID });
        assertEquals(fetchMock.updates, [{ status: 'submitted' }]);
        assertEquals(fetchMock.lookups[0].searchParams.get('id'), `eq.${REGISTRATION_ID}`);
        assertEquals(fetchMock.audits[0].action, 'reactivate_registration');
        assertEquals(fetchMock.audits[0].resource_id, REGISTRATION_ID);
        assertEquals(fetchMock.audits[0].metadata, {
          email: EMAIL,
          event_id: EVENT_ID,
          previous_status: 'cancelled',
          next_status: 'submitted',
          source: 'public_registration',
        });
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'reactivate-public-registration remains successful when audit logging fails',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({ registration: cancelledRegistration(), auditStatus: 500 });
      try {
        const response = await handleReactivatePublicRegistration(
          buildRequest({ registration_id: REGISTRATION_ID }),
        );
        assertEquals(response.status, 200);
        assertEquals(fetchMock.updates, [{ status: 'submitted' }]);
      } finally {
        fetchMock.restore();
      }
    });
  },
);
