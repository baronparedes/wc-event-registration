import { assertEquals, assertMatch } from '@std/assert';

import { getSystemPrompt, getUserPrompt, parseStandInResponse } from '../prompt.ts';
import type { RecommendStandInPayload } from '../types.ts';

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
                    recommendations: [
                      {
                        candidateToken: 'USR_001',
                        rank: 1,
                        reasoning: 'Highest turnup rate (95%) and flexible availability.',
                      },
                    ],
                    invitations: {
                      sms: 'Hi {{volunteer_name}}, can you serve as {{role}} this Sunday, {{service_date}} at {{service_time}}? Thank you!',
                      viber:
                        'Hi {{volunteer_name}}! Would you be available to walk in for {{role}} this Sunday, {{service_date}} at {{service_time}}? Thank you for serving!',
                      whatsapp:
                        'Hi {{volunteer_name}}! Would you be available to walk in for {{role}} this Sunday, {{service_date}} at {{service_time}}? Thank you for serving!',
                      email: {
                        subject: 'Welcome Center: Walk-in for {{service_date}}',
                        body: 'Hi {{volunteer_name}},\n\nCould you walk in for {{role}} at {{service_time}} on {{service_date}}? Let us know.\n\nBlessings!',
                      },
                    },
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
    const { handleRecommendStandIn } = await import('../handler.ts');
    await run(handleRecommendStandIn);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, val] of previous) {
      if (val === undefined) {
        Deno.env.delete(name);
      } else {
        Deno.env.set(name, val);
      }
    }
  }
}

Deno.test('getSystemPrompt enforces PII-free anonymous schema and length bounds', () => {
  const prompt = getSystemPrompt(10);
  assertMatch(prompt, /up to 10/);
  assertMatch(prompt, /Zero PII Leakage/);
  assertMatch(prompt, /recommendations/);
  assertMatch(prompt, /invitations/);
  assertMatch(prompt, /{{volunteer_name}}/);
});

Deno.test('getUserPrompt formats assignment details and candidate tokens with neededCount', () => {
  const payload: RecommendStandInPayload = {
    targetDate: '2026-11-01',
    timeSlot: '9AM',
    role: 'Usher',
    neededCount: 10,
    candidates: [
      {
        token: 'USR_001',
        turnupRate: 92,
        attendanceScore: 11.2,
        tier: 'solid',
        usualSlots: ['9AM'],
      },
    ],
  };

  const userPrompt = getUserPrompt(payload);
  assertMatch(userPrompt, /2026-11-01/);
  assertMatch(userPrompt, /9:00 AM/);
  assertMatch(userPrompt, /Usher/);
  assertMatch(userPrompt, /Active volunteer deficit of 10/);
  assertMatch(userPrompt, /select the top picks \(up to 10\)/);
  assertMatch(userPrompt, /USR_001/);
});

Deno.test(
  'parseStandInResponse slices up to neededCount recommendations and handles fallback',
  () => {
    const payload: RecommendStandInPayload = {
      targetDate: '2026-11-01',
      timeSlot: '9AM',
      role: 'Usher',
      neededCount: 5,
      candidates: [
        { token: 'USR_001', turnupRate: 90, attendanceScore: 10, tier: 'solid' },
        { token: 'USR_002', turnupRate: 85, attendanceScore: 9, tier: 'solid' },
        { token: 'USR_003', turnupRate: 80, attendanceScore: 8, tier: 'solid' },
        { token: 'USR_004', turnupRate: 75, attendanceScore: 7, tier: 'solid' },
        { token: 'USR_005', turnupRate: 70, attendanceScore: 6, tier: 'solid' },
        { token: 'USR_006', turnupRate: 65, attendanceScore: 5, tier: 'moderate' },
      ],
    };

    // Test when LLM returns no recommendations (fallback triggers up to neededCount)
    const fallbackParsed = parseStandInResponse('{}', payload);
    assertEquals(fallbackParsed.recommendations.length, 5);
    assertEquals(fallbackParsed.recommendations[0].candidateToken, 'USR_001');
    assertEquals(fallbackParsed.recommendations[4].candidateToken, 'USR_005');
  },
);

Deno.test(
  'parseStandInResponse slices up to neededCount recommendations and handles fallback',
  () => {
    const payload: RecommendStandInPayload = {
      targetDate: '2026-11-01',
      timeSlot: '9AM',
      role: 'Usher',
      neededCount: 5,
      candidates: [
        { token: 'USR_001', turnupRate: 90, attendanceScore: 10, tier: 'solid' },
        { token: 'USR_002', turnupRate: 85, attendanceScore: 9, tier: 'solid' },
        { token: 'USR_003', turnupRate: 80, attendanceScore: 8, tier: 'solid' },
        { token: 'USR_004', turnupRate: 75, attendanceScore: 7, tier: 'solid' },
        { token: 'USR_005', turnupRate: 70, attendanceScore: 6, tier: 'solid' },
        { token: 'USR_006', turnupRate: 65, attendanceScore: 5, tier: 'moderate' },
      ],
    };

    // Test when LLM returns no recommendations (fallback triggers up to neededCount)
    const fallbackParsed = parseStandInResponse('{}', payload);
    assertEquals(fallbackParsed.recommendations.length, 5);
    assertEquals(fallbackParsed.recommendations[0].candidateToken, 'USR_001');
    assertEquals(fallbackParsed.recommendations[4].candidateToken, 'USR_005');
  },
);

Deno.test('parseStandInResponse correctly extracts JSON and handles fallbacks', () => {
  const payload: RecommendStandInPayload = {
    targetDate: '2026-11-01',
    timeSlot: '9AM',
    role: 'Prayer Coach',
    candidates: [
      {
        token: 'USR_001',
        turnupRate: 90,
        attendanceScore: 10,
        tier: 'solid',
      },
    ],
  };

  const rawJson = JSON.stringify({
    recommendations: [
      {
        candidateToken: 'USR_001',
        rank: 1,
        reasoning: 'Reliable volunteer.',
      },
    ],
    invitations: {
      sms: 'Hi {{volunteer_name}}, walk-in available?',
      viber: 'Hi {{volunteer_name}}, walk-in available via Viber?',
      whatsapp: 'Hi {{volunteer_name}}, would you be available to serve?',
      email: {
        subject: 'Walk-in request',
        body: 'Please let us know.',
      },
    },
  });

  const parsed = parseStandInResponse(rawJson, payload);
  assertEquals(parsed.recommendations.length, 1);
  assertEquals(parsed.recommendations[0].candidateToken, 'USR_001');
  assertEquals(parsed.invitations.sms, 'Hi {{volunteer_name}}, walk-in available?');
  assertEquals(parsed.invitations.viber, 'Hi {{volunteer_name}}, walk-in available via Viber?');
});

Deno.test('handleRecommendStandIn returns 401 when no auth token provided', async () => {
  await withEnv({ apiKey: 'test-api-key' }, async (handle) => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: {
        Origin: ORIGIN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetDate: '2026-11-01',
        timeSlot: '9AM',
        role: 'Prayer Coach',
        candidates: [{ token: 'USR_001', turnupRate: 90, attendanceScore: 10, tier: 'solid' }],
      }),
    });

    const res = await handle(req);
    assertEquals(res.status, 401);
  });
});

Deno.test('handleRecommendStandIn returns recommendations with valid admin auth', async () => {
  await withEnv({ apiKey: 'test-api-key', role: 'admin' }, async (handle) => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: {
        Origin: ORIGIN,
        Authorization: 'Bearer valid-jwt-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetDate: '2026-11-01',
        timeSlot: '9AM',
        role: 'Prayer Coach',
        candidates: [{ token: 'USR_001', turnupRate: 90, attendanceScore: 10, tier: 'solid' }],
      }),
    });

    const res = await handle(req);
    assertEquals(res.status, 200);

    const body = await res.json();
    assertEquals(body.success, true);
    assertEquals(body.data.recommendations.length, 1);
    assertEquals(body.data.recommendations[0].candidateToken, 'USR_001');
    assertMatch(body.data.invitations.viber, /{{volunteer_name}}/);
  });
});
