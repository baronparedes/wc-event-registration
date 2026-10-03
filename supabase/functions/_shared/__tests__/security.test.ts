import { assertEquals } from '@std/assert';
import { createClient } from '@supabase/supabase-js';

import { ERROR_CODES, HTTP_STATUS } from '../constants.ts';
import type { Database } from '../database.types.ts';
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  enforceInMemoryRateLimit,
  enforcePublicRateLimit,
  getRequestIdentityForRateLimit,
  isOriginAllowed,
  logAdminAction,
  readAllowedOrigins,
  requireAdminAccess,
  requireAuthAccess,
} from '../security.ts';

const CORS_HEADERS = { 'Access-Control-Allow-Origin': 'https://app.example.com' };

async function withEnvironment(
  values: Record<string, string | undefined>,
  run: () => Promise<void> | void,
) {
  const previousValues = new Map(
    Object.keys(values).map((key) => [key, Deno.env.get(key)] as const),
  );

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) Deno.env.delete(key);
    else Deno.env.set(key, value);
  }

  try {
    await run();
  } finally {
    for (const [key, value] of previousValues) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

async function withMockFetch(
  mock: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  run: () => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve(Response.json(body));
}

Deno.test(
  'enforceInMemoryRateLimit applies the hit limit and resets at the window boundary',
  () => {
    const key = `rate-limit-test:${crypto.randomUUID()}`;

    assertEquals(enforceInMemoryRateLimit({ key, windowMs: 1_000, maxHits: 2, nowMs: 10_000 }), {
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 0,
    });
    assertEquals(enforceInMemoryRateLimit({ key, windowMs: 1_000, maxHits: 2, nowMs: 10_400 }), {
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 0,
    });
    assertEquals(enforceInMemoryRateLimit({ key, windowMs: 1_000, maxHits: 2, nowMs: 10_400 }), {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 1,
    });
    assertEquals(enforceInMemoryRateLimit({ key, windowMs: 1_000, maxHits: 2, nowMs: 11_000 }), {
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 0,
    });
  },
);

Deno.test('getRequestIdentityForRateLimit uses forwarded IP headers in precedence order', () => {
  assertEquals(
    getRequestIdentityForRateLimit(
      new Request('https://app.example.com', {
        headers: {
          'x-forwarded-for': '203.0.113.1, 203.0.113.2',
          'x-real-ip': '203.0.113.3',
          'cf-connecting-ip': '203.0.113.4',
        },
      }),
      'https://app.example.com',
    ),
    '203.0.113.1',
  );
  assertEquals(
    getRequestIdentityForRateLimit(
      new Request('https://app.example.com', { headers: { 'x-real-ip': '203.0.113.3' } }),
      null,
    ),
    '203.0.113.3',
  );
  assertEquals(
    getRequestIdentityForRateLimit(new Request('https://app.example.com'), null),
    'origin:unknown',
  );
});

Deno.test(
  'enforcePublicRateLimit applies stricter limits to requests without a browser user agent',
  async () => {
    const scope = `public-rate-test:${crypto.randomUUID()}`;
    const options = {
      req: new Request('https://app.example.com', {
        headers: { origin: 'https://app.example.com', 'x-real-ip': '203.0.113.25' },
      }),
      origin: 'https://app.example.com',
      corsHeaders: CORS_HEADERS,
      scope,
      windowMs: 60_000,
      maxHits: 10,
    };

    assertEquals(enforcePublicRateLimit(options), null);
    assertEquals(enforcePublicRateLimit(options), null);
    const limitedResponse = enforcePublicRateLimit(options);
    if (!limitedResponse) throw new Error('Expected the suspicious request to be rate limited');

    assertEquals(limitedResponse.status, HTTP_STATUS.tooManyRequests);
    assertEquals(limitedResponse.headers.has('Retry-After'), true);
    assertEquals(await limitedResponse.json(), {
      success: false,
      error: 'Too many requests',
      error_code: ERROR_CODES.rateLimited,
      retry_after_seconds: 60,
    });
  },
);

Deno.test(
  'readAllowedOrigins normalizes valid origins and blocks localhost in production',
  async () => {
    await withEnvironment(
      {
        ALLOWED_ORIGINS:
          ' https://app.example.com/path, https://app.example.com, ftp://bad.example ',
        RUNTIME_ENV: 'local',
      },
      () => {
        assertEquals(readAllowedOrigins(), ['https://app.example.com']);
      },
    );

    await withEnvironment(
      {
        ALLOWED_ORIGINS: 'https://app.example.com,http://localhost:5173',
        RUNTIME_ENV: 'production',
      },
      () => {
        assertEquals(readAllowedOrigins(), []);
      },
    );
  },
);

Deno.test(
  'CORS helpers only allow exact listed origins and obscured denies remain generic',
  async () => {
    assertEquals(isOriginAllowed('https://app.example.com', ['https://app.example.com']), true);
    assertEquals(isOriginAllowed('https://evil.example', ['https://app.example.com']), false);
    assertEquals(isOriginAllowed(null, ['https://app.example.com']), false);
    assertEquals(buildCorsHeaders('https://app.example.com', ['https://app.example.com']), {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Expose-Headers': 'Content-Disposition',
      'Access-Control-Allow-Origin': 'https://app.example.com',
      Vary: 'Origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    });

    const response = createObscuredDenyResponse(CORS_HEADERS);
    assertEquals(response.status, HTTP_STATUS.notFound);
    assertEquals(await response.json(), { success: false, error: 'Not found' });
  },
);

Deno.test('requireAuthAccess rejects missing and malformed bearer tokens', async () => {
  const baseOptions = {
    requestId: 'request-1',
    logPrefix: 'security-test',
    supabaseUrl: 'https://example.supabase.co',
    supabaseServiceKey: 'service-key',
    corsHeaders: CORS_HEADERS,
  };

  for (const authHeader of [null, 'Basic token', 'Bearer   ']) {
    const result = await requireAuthAccess({ ...baseOptions, authHeader });
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.response.status, HTTP_STATUS.unauthorized);
    }
  }
});

Deno.test('requireAuthAccess resolves the authenticated user from Supabase Auth', async () => {
  await withMockFetch(
    (input) => {
      const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
      if (requestUrl.pathname === '/auth/v1/user') {
        return jsonResponse({ id: 'authenticated-user' });
      }
      return Promise.resolve(new Response('Unexpected request', { status: 500 }));
    },
    async () => {
      const result = await requireAuthAccess({
        requestId: 'request-2',
        logPrefix: 'security-test',
        supabaseUrl: 'https://example.supabase.co',
        supabaseServiceKey: 'service-key',
        authHeader: 'Bearer user-token',
        corsHeaders: CORS_HEADERS,
      });

      assertEquals(result, { ok: true, userId: 'authenticated-user' });
    },
  );
});

Deno.test('requireAdminAccess enforces the configured admin role allowlist', async () => {
  await withMockFetch(
    (input) => {
      const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
      if (requestUrl.pathname === '/auth/v1/user') {
        return jsonResponse({ id: 'admin-user' });
      }
      if (requestUrl.pathname === '/rest/v1/admins') {
        return jsonResponse({ id: 'admin-record', role: 'kiosk' });
      }
      return Promise.resolve(new Response('Unexpected request', { status: 500 }));
    },
    async () => {
      const options = {
        requestId: 'request-3',
        logPrefix: 'security-test',
        supabaseUrl: 'https://example.supabase.co',
        supabaseServiceKey: 'service-key',
        authHeader: 'Bearer admin-token',
        corsHeaders: CORS_HEADERS,
      };

      const defaultResult = await requireAdminAccess(options);
      assertEquals(defaultResult.ok, false);
      if (!defaultResult.ok) assertEquals(defaultResult.response.status, HTTP_STATUS.unauthorized);

      const allowedResult = await requireAdminAccess({ ...options, allowedRoles: ['kiosk'] });
      assertEquals(allowedResult, { ok: true, userId: 'admin-user' });
    },
  );
});

Deno.test('logAdminAction resolves the admin record and writes the audit payload', async () => {
  let auditPayload: unknown;

  await withMockFetch(
    (input, init) => {
      const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
      if (requestUrl.pathname === '/rest/v1/admins') {
        return jsonResponse({ id: 'admin-record' });
      }
      if (requestUrl.pathname === '/rest/v1/admin_audit_logs') {
        auditPayload = JSON.parse(String(init?.body));
        return Promise.resolve(new Response(null, { status: 201 }));
      }
      return Promise.resolve(new Response('Unexpected request', { status: 500 }));
    },
    async () => {
      const adminClient = createClient<Database>('https://example.supabase.co', 'service-key');
      await logAdminAction({
        adminClient,
        adminUserId: 'admin-user',
        action: 'test_action',
        resourceType: 'test_resource',
        metadata: { count: 2 },
      });
    },
  );

  assertEquals(auditPayload, {
    admin_id: 'admin-record',
    action: 'test_action',
    resource_type: 'test_resource',
    resource_id: null,
    metadata: { count: 2 },
  });
});

Deno.test('logAdminAction skips database access when there is no admin user ID', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = () => {
    fetchCalls += 1;
    return Promise.resolve(new Response(null, { status: 500 }));
  };

  try {
    const adminClient = createClient<Database>('https://example.supabase.co', 'service-key');
    await logAdminAction({
      adminClient,
      adminUserId: null,
      action: 'test_action',
      resourceType: 'test_resource',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assertEquals(fetchCalls, 0);
});
