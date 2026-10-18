import { assertEquals } from '@std/assert';

import { createMemberLookupToken } from '@/shared/memberLookupToken.ts';

import { handleSubmitServiceExcuse } from '../handler.ts';

const ORIGIN = 'https://app.example.com';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const EXCUSE_ID = '22222222-2222-4222-8222-222222222222';
const TOKEN_SECRET = 'test-token-secret-must-be-long-enough-32-chars';
let requestNumber = 0;

async function withEnv(run: () => Promise<void>) {
  const names = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ALLOWED_ORIGINS',
    'EDGE_TOKEN_ENCRYPTION_SECRET',
  ];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', ORIGIN);
  Deno.env.set('EDGE_TOKEN_ENCRYPTION_SECRET', TOKEN_SECRET);
  try {
    await run();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function request(body: unknown, authHeader?: string) {
  const headers: Record<string, string> = {
    origin: ORIGIN,
    'content-type': 'application/json',
    'x-forwarded-for': `203.0.113.${++requestNumber}`,
  };
  if (authHeader) {
    headers.authorization = authHeader;
  }
  return new Request('https://example.functions/submit-service-excuse', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(
  options: {
    user?: unknown;
    existingExcuse?: unknown;
    insertedExcuse?: unknown;
    updatedExcuse?: unknown;
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
    if (url.pathname === options.failPath) {
      return Promise.resolve(Response.json({ message: 'write failed' }, { status: 500 }));
    }
    if (url.pathname === '/rest/v1/users') {
      return Promise.resolve(
        Response.json(
          options.user === undefined
            ? { id: USER_ID, member_id: 'MEM-1001', is_active: true }
            : options.user,
        ),
      );
    }
    if (url.pathname === '/rest/v1/service_excuse_requests') {
      if (method === 'GET') {
        return Promise.resolve(Response.json(options.existingExcuse ?? null));
      }
      if (method === 'POST') {
        return Promise.resolve(
          Response.json(
            options.insertedExcuse ?? {
              id: EXCUSE_ID,
              user_id: USER_ID,
              member_id: 'MEM-1001',
              request_date: '2026-10-18',
              services: ['All Services'],
              reason: 'Traveling',
              status: 'approved',
            },
          ),
        );
      }
      if (method === 'PATCH') {
        return Promise.resolve(
          Response.json(
            options.updatedExcuse ?? {
              id: EXCUSE_ID,
              user_id: USER_ID,
              member_id: 'MEM-1001',
              request_date: '2026-10-18',
              services: ['1st Service'],
              reason: 'Updated reason',
              status: 'approved',
            },
          ),
        );
      }
    }
    if (url.pathname === '/rest/v1/approval_requests' && method === 'POST') {
      return Promise.resolve(Response.json({ id: 'appr-1', access_token: 'token-xyz' }));
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

Deno.test('submit-service-excuse validates required fields and format', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch();
    try {
      // Missing member info
      const res1 = await handleSubmitServiceExcuse(
        request({
          request_date: '2026-10-18',
          services: ['All Services'],
        }),
      );
      assertEquals(res1.status, 400);

      // Invalid date format
      const res2 = await handleSubmitServiceExcuse(
        request({
          member_id: 'MEM-1001',
          request_date: '10-18-2026',
          services: ['All Services'],
        }),
      );
      assertEquals(res2.status, 400);

      // Empty services array
      const res3 = await handleSubmitServiceExcuse(
        request({
          member_id: 'MEM-1001',
          request_date: '2026-10-18',
          services: [],
        }),
      );
      assertEquals(res3.status, 400);

      assertEquals(fetchMock.calls, []);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('submit-service-excuse rejects invalid member_token', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch();
    try {
      const response = await handleSubmitServiceExcuse(
        request({
          member_token: 'mlt2.invalid.token',
          request_date: '2026-10-18',
          services: ['All Services'],
        }),
      );
      assertEquals(response.status, 400);
      const data = await response.json();
      assertEquals(data.error_code, 'INVALID_TOKEN');
      assertEquals(fetchMock.calls, []);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('submit-service-excuse successfully submits with member_token', async () => {
  await withEnv(async () => {
    const token = await createMemberLookupToken('MEM-1001', null);
    const fetchMock = mockFetch();
    try {
      const response = await handleSubmitServiceExcuse(
        request({
          member_token: token,
          request_date: '2026-10-18',
          services: ['All Services'],
          reason: 'Family event',
        }),
      );
      assertEquals(response.status, 200);
      const data = await response.json();
      assertEquals(data.success, true);
      assertEquals(data.excuse.id, EXCUSE_ID);
      assertEquals(data.excuse.member_id, 'MEM-1001');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('submit-service-excuse updates existing excuse request if already present', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch({
      existingExcuse: { id: EXCUSE_ID },
    });
    try {
      const response = await handleSubmitServiceExcuse(
        request({
          member_id: 'MEM-1001',
          request_date: '2026-10-18',
          services: ['1st Service'],
          reason: 'Updated reason',
        }),
      );
      assertEquals(response.status, 200);
      const data = await response.json();
      assertEquals(data.success, true);
      assertEquals(data.excuse.services, ['1st Service']);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('submit-service-excuse returns 404 when member is not found or inactive', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch({ user: null });
    try {
      const response = await handleSubmitServiceExcuse(
        request({
          member_id: 'UNKNOWN-999',
          request_date: '2026-10-18',
          services: ['All Services'],
        }),
      );
      assertEquals(response.status, 404);
      const data = await response.json();
      assertEquals(data.error_code, 'MEMBER_NOT_FOUND');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'submit-service-excuse creates pending approval request for multi-week long leave',
  async () => {
    await withEnv(async () => {
      const fetchMock = mockFetch();
      try {
        const response = await handleSubmitServiceExcuse(
          request({
            user_id: USER_ID,
            start_date: '2026-11-01',
            end_date: '2026-11-29',
            is_long_leave: true,
            services: ['All Services'],
            reason: 'Extended mission trip',
            assigned_to_email: 'leader@example.com',
          }),
        );
        assertEquals(response.status, 200);
        const data = await response.json();
        assertEquals(data.success, true);
        assertEquals(data.message, 'Long leave request submitted and is pending approval');

        // Check excuse insertion with pending status
        const excuseInsert = fetchMock.calls.find(
          (call) => call.path === '/rest/v1/service_excuse_requests' && call.method === 'POST',
        );
        assertEquals((excuseInsert?.body as Record<string, unknown>)?.status, 'pending');
        assertEquals((excuseInsert?.body as Record<string, unknown>)?.is_long_leave, true);

        // Check approval request insertion
        const approvalInsert = fetchMock.calls.find(
          (call) => call.path === '/rest/v1/approval_requests' && call.method === 'POST',
        );
        assertEquals(Boolean(approvalInsert), true);
        assertEquals(
          (approvalInsert?.body as Record<string, unknown>)?.assigned_to_email,
          'leader@example.com',
        );
        assertEquals(
          (approvalInsert?.body as Record<string, unknown>)?.title,
          'Long Leave Request',
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);
