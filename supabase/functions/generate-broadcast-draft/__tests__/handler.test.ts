import { assertEquals, assertMatch } from '@std/assert';

import { getSystemPrompt, getUserPrompt, parseDraftResponse } from '../prompt.ts';

const ORIGIN = 'https://app.example.com';

function isHostnameAllowed(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

async function withEnv(
  options: { apiKey?: string; role?: string; adminId?: string } = {},
  run: (handle: (req: Request) => Promise<Response>) => Promise<void>,
) {
  const adminId = options.adminId ?? crypto.randomUUID();
  const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS', 'GOOGLE_API_KEY'];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));

  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', ORIGIN);

  if (options.apiKey !== undefined) {
    Deno.env.set('GOOGLE_API_KEY', options.apiKey);
  } else {
    Deno.env.delete('GOOGLE_API_KEY');
    Deno.env.delete('GOOGLE_GENERATIVE_AI_API_KEY');
  }

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());

    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: adminId }));
    }
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: options.role ?? 'admin' }));
    }
    // Mock Google Generative AI API endpoint
    if (
      isHostnameAllowed(url.hostname, 'googleapis.com') ||
      isHostnameAllowed(url.hostname, 'generativelanguage.googleapis.com')
    ) {
      const mockResponseBody = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: 'Sunday Service Reminder',
                    message: 'Call time is 8:15 AM for prayer. See you there!',
                  }),
                },
              ],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 60, totalTokenCount: 110 },
      };
      return Promise.resolve(Response.json(mockResponseBody));
    }

    return Promise.resolve(new Response('Not Found', { status: 404 }));
  };

  try {
    const { handleGenerateBroadcastDraft } = await import('../handler.ts');
    await run(handleGenerateBroadcastDraft);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function request(body: unknown, authenticated = true) {
  const headers = new Headers({ origin: ORIGIN, 'content-type': 'application/json' });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');
  return new Request('https://example.functions/generate-broadcast-draft', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

// 1. Pure Prompt & Parser Tests
Deno.test('getSystemPrompt strictly bans AI slop, clichés, and filler words', () => {
  const systemPrompt = getSystemPrompt();
  assertMatch(systemPrompt, /NO AI SLOP & EDITORIAL EXCELLENCE RULES/);
  assertMatch(systemPrompt, /Zero AI Slop & Buzzwords/);
  assertMatch(systemPrompt, /delve/);
  assertMatch(systemPrompt, /tapestry/);
  assertMatch(systemPrompt, /No Hollow Openers or Sign-offs/);
  assertMatch(systemPrompt, /Authentic Human Voice/);
  assertMatch(systemPrompt, /Zero PII Leakage/);
});

Deno.test('parseDraftResponse parses clean unified JSON', () => {
  const jsonStr = JSON.stringify({
    title: 'Sunday Service Reminder',
    message: 'Doors open at 9 AM for fellowship.',
  });

  const result = parseDraftResponse(jsonStr);
  assertEquals(result.title, 'Sunday Service Reminder');
  assertEquals(result.message, 'Doors open at 9 AM for fellowship.');
  assertEquals(result.push.title, 'Sunday Service Reminder');
  assertEquals(result.push.body, 'Doors open at 9 AM for fellowship.');
});

Deno.test('parseDraftResponse handles markdown codeblock wrapper with and without json tag', () => {
  const wrappedWithJson = '```json\n{"title":"Alert 1","message":"Details 1"}\n```';
  const result1 = parseDraftResponse(wrappedWithJson);
  assertEquals(result1.title, 'Alert 1');
  assertEquals(result1.message, 'Details 1');

  const wrappedWithoutTag = '```\n{"title":"Alert 2","message":"Details 2"}\n```';
  const result2 = parseDraftResponse(wrappedWithoutTag);
  assertEquals(result2.title, 'Alert 2');
  assertEquals(result2.message, 'Details 2');
});

Deno.test('parseDraftResponse handles legacy push/email fallbacks and body fallback', () => {
  const pushFallback = JSON.stringify({
    push: { title: 'Push Title', body: 'Push Message' },
  });
  const res1 = parseDraftResponse(pushFallback);
  assertEquals(res1.title, 'Push Title');
  assertEquals(res1.message, 'Push Message');

  const emailFallback = JSON.stringify({
    email: { title: 'Email Title', body: 'Email Message' },
  });
  const res2 = parseDraftResponse(emailFallback);
  assertEquals(res2.title, 'Email Title');
  assertEquals(res2.message, 'Email Message');

  const bodyFallback = JSON.stringify({
    title: 'Custom Title',
    body: 'Only Body Specified',
  });
  const res3 = parseDraftResponse(bodyFallback);
  assertEquals(res3.title, 'Custom Title');
  assertEquals(res3.message, 'Only Body Specified');
});

Deno.test('parseDraftResponse falls back to defaults for empty object', () => {
  const empty = JSON.stringify({});
  const result = parseDraftResponse(empty);
  assertEquals(result.title, 'Church Announcement');
  assertEquals(result.message, 'Please check the app for the latest updates.');
});

Deno.test('parseDraftResponse clamps excessive lengths', () => {
  const overlyLong = JSON.stringify({
    title: 'A'.repeat(150),
    message: 'B'.repeat(600),
  });

  const result = parseDraftResponse(overlyLong);
  assertEquals(result.title.length, 100);
  assertEquals(result.message.length, 500);
  assertEquals(result.push.title.length, 100);
  assertEquals(result.push.body.length, 500);
});

Deno.test('getUserPrompt structures instructions with tone and audience permutations', () => {
  // Urgent + Role
  const promptRole = getUserPrompt({
    mode: 'new',
    notes: 'Prayer meeting tomorrow 7pm',
    tone: 'urgent',
    targetType: 'role',
    targetRoles: ['Prayer Coach', 'OIC'],
  });
  assertMatch(promptRole, /Mode: New Draft from Notes/);
  assertMatch(promptRole, /Tone: Urgent & Direct/);
  assertMatch(promptRole, /Prayer Coach, OIC/);
  assertMatch(promptRole, /Prayer meeting tomorrow 7pm/);

  // Role with empty roles array
  const promptEmptyRole = getUserPrompt({
    mode: 'new',
    notes: 'Sample notes',
    tone: 'urgent',
    targetType: 'role',
    targetRoles: [],
  });
  assertEquals(promptEmptyRole.includes('Audience: Specific ministry roles'), false);

  // Pastoral + Event
  const promptEvent = getUserPrompt({
    mode: 'polish',
    notes: 'Pls come to our event',
    tone: 'pastoral',
    targetType: 'event',
  });
  assertMatch(promptEvent, /Mode: Polish Existing Draft/);
  assertMatch(promptEvent, /Tone: Pastoral & Warm/);
  assertMatch(promptEvent, /Audience: Event attendees and registrants/);

  // Informative + All
  const promptAll = getUserPrompt({
    mode: 'new',
    notes: 'Church picnic this Saturday',
    tone: 'informative',
    targetType: 'all',
  });
  assertMatch(promptAll, /Tone: Informative & Clear/);
  assertMatch(promptAll, /Audience: All church members and attendees/);

  // Fun + Role
  const promptFun = getUserPrompt({
    mode: 'new',
    notes: 'Youth night pizza and games!',
    tone: 'fun',
  });
  assertMatch(promptFun, /Tone: Fun & Engaging/);
  assertMatch(promptFun, /emojis/i);
});

// 2. Handler Security & Validation Tests
Deno.test('generate-broadcast-draft handles OPTIONS preflight request', async () => {
  await withEnv({}, async (handle) => {
    const preflight = new Request('https://example.functions/generate-broadcast-draft', {
      method: 'OPTIONS',
      headers: new Headers({ origin: ORIGIN }),
    });
    const res = await handle(preflight);
    assertEquals(res.status, 200);
    assertEquals(res.headers.get('access-control-allow-origin'), ORIGIN);
  });
});

Deno.test(
  'generate-broadcast-draft rejects invalid input and unauthenticated callers',
  async () => {
    await withEnv({}, async (handle) => {
      // Missing notes
      const badInputRes = await handle(request({ notes: '' }));
      assertEquals(badInputRes.status, 400);

      // Unauthenticated
      const unauthRes = await handle(request({ notes: 'Valid notes' }, false));
      assertEquals(unauthRes.status, 401);
    });
  },
);

Deno.test('generate-broadcast-draft rejects non-admin roles', async () => {
  await withEnv({ role: 'slod' }, async (handle) => {
    const res = await handle(request({ notes: 'Valid notes' }));
    assertEquals(res.status, 401);
  });
});

Deno.test('generate-broadcast-draft allows super_admin role', async () => {
  await withEnv({ apiKey: 'fake-google-api-key', role: 'super_admin' }, async (handle) => {
    const res = await handle(request({ notes: 'Super admin announcement' }));
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.success, true);
  });
});

Deno.test('generate-broadcast-draft falls back to GOOGLE_GENERATIVE_AI_API_KEY', async () => {
  const previousKey = Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY');
  Deno.env.set('GOOGLE_GENERATIVE_AI_API_KEY', 'fallback-key');
  try {
    await withEnv({ apiKey: undefined, role: 'admin' }, async (handle) => {
      Deno.env.set('GOOGLE_GENERATIVE_AI_API_KEY', 'fallback-key');
      const res = await handle(request({ notes: 'Valid notes' }));
      assertEquals(res.status, 200);
    });
  } finally {
    if (previousKey === undefined) Deno.env.delete('GOOGLE_GENERATIVE_AI_API_KEY');
    else Deno.env.set('GOOGLE_GENERATIVE_AI_API_KEY', previousKey);
  }
});

Deno.test('generate-broadcast-draft returns 500 when GOOGLE_API_KEY is missing', async () => {
  await withEnv({ apiKey: undefined, role: 'admin' }, async (handle) => {
    const res = await handle(request({ notes: 'Sunday announcement notes' }));
    assertEquals(res.status, 500);
    const body = await res.json();
    assertEquals(body.error, 'AI drafting service is not configured');
  });
});

Deno.test('generate-broadcast-draft enforces rate limiting after 20 hits', async () => {
  await withEnv({ apiKey: 'fake-google-api-key', role: 'admin' }, async (handle) => {
    // Fire 20 requests
    for (let i = 0; i < 20; i++) {
      const res = await handle(request({ notes: `Hit ${i}` }));
      assertEquals(res.status, 200);
    }

    // 21st request should be rate limited
    const limitedRes = await handle(request({ notes: 'Hit 21' }));
    assertEquals(limitedRes.status, 429);
    const body = await limitedRes.json();
    assertEquals(body.error_code, 'RATE_LIMITED');
    assertMatch(body.error, /Too many draft requests/);
  });
});

Deno.test('generate-broadcast-draft handles upstream AI error gracefully', async () => {
  const originalFetch = globalThis.fetch;
  try {
    await withEnv({ apiKey: 'fake-google-api-key', role: 'admin' }, async (handle) => {
      // Override fetch to make Gemini endpoint fail immediately without retrying
      globalThis.fetch = (input) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.pathname === '/auth/v1/user') {
          return Promise.resolve(Response.json({ id: crypto.randomUUID() }));
        }
        if (url.pathname === '/rest/v1/admins') {
          return Promise.resolve(Response.json({ id: 'admin-row', role: 'admin' }));
        }
        if (
          url.hostname.includes('googleapis.com') ||
          url.hostname.includes('generativelanguage')
        ) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: { message: 'Invalid model request' } }), {
              status: 400,
              headers: { 'content-type': 'application/json' },
            }),
          );
        }
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      };

      const res = await handle(request({ notes: 'Valid notes' }));
      assertEquals(res.status, 500);
      const body = await res.json();
      assertMatch(body.error, /Failed to generate draft/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test('generate-broadcast-draft successfully generates structured draft', async () => {
  await withEnv({ apiKey: 'fake-google-api-key', role: 'admin' }, async (handle) => {
    const res = await handle(
      request({
        mode: 'new',
        notes: 'Usher reminder: call time 8:15 AM for prayer, wear blue vest',
        tone: 'pastoral',
        targetType: 'role',
        targetRoles: ['Usher'],
      }),
    );

    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.success, true);
    assertEquals(body.draft.title, 'Sunday Service Reminder');
    assertMatch(body.draft.message, /8:15 AM/);
    assertEquals(body.draft.push.title, 'Sunday Service Reminder');
    assertMatch(body.draft.push.body, /8:15 AM/);
  });
});
