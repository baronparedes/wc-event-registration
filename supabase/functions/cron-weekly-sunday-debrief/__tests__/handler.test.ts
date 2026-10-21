import { assertEquals, assertMatch } from '@std/assert';

import { formatKeyHighlightsHtml, formatSundayDebriefEmailText } from '@/shared/emailTemplate.ts';

import { getSystemPrompt, getUserPrompt, parseDebriefResponse } from '../prompt.ts';
import { computeSundayMetrics, resolvePreviousSunday } from '../utils.ts';

const ORIGIN = 'https://app.example.com';

function isHostnameAllowed(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

async function withEnv(
  options: {
    apiKey?: string;
    role?: string;
    adminId?: string;
    cronKey?: string;
  } = {},
  run: (handle: (req: Request) => Promise<Response>) => Promise<void>,
) {
  const adminId = options.adminId ?? crypto.randomUUID();
  const names = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ALLOWED_ORIGINS',
    'GOOGLE_API_KEY',
    'CRON_ROLE_KEY',
  ];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));

  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', ORIGIN);
  Deno.env.set('CRON_ROLE_KEY', options.cronKey ?? 'valid-cron-key');

  if (options.apiKey !== undefined) {
    Deno.env.set('GOOGLE_API_KEY', options.apiKey);
  } else {
    Deno.env.delete('GOOGLE_API_KEY');
    Deno.env.delete('GOOGLE_GENERATIVE_AI_API_KEY');
  }

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());

    // Supabase auth user lookup
    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: adminId }));
    }
    // Supabase admin role verification
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: options.role ?? 'admin' }));
    }
    // RPC: get_service_dashboard_stats
    if (url.pathname === '/rest/v1/rpc/get_service_dashboard_stats') {
      return Promise.resolve(
        Response.json({
          time_slots: {
            '9AM': {
              committed: 40,
              present: 38,
              walk_ins: 5,
              late_tardy: 2,
              roles: { Usher: 14, Greeter: 8, Production: 16 },
              committed_roles: { Usher: 16, Greeter: 8, Production: 16 },
            },
            '12NN': {
              committed: 30,
              present: 25,
              walk_ins: 2,
              late_tardy: 1,
              roles: { Usher: 10, Greeter: 5, Production: 10 },
              committed_roles: { Usher: 12, Greeter: 6, Production: 12 },
            },
          },
          roles: ['Greeter', 'Production', 'Usher'],
          committed_roles: ['Greeter', 'Production', 'Usher'],
        }),
      );
    }
    // Table: service_weekly_briefs upsert
    if (url.pathname === '/rest/v1/service_weekly_briefs') {
      return Promise.resolve(
        Response.json({
          id: 'mock-brief-id',
          sunday_date: '2026-10-18',
          turnup_rate: 90.0,
          peak_slot: '9AM',
          total_committed: 70,
          total_present: 63,
          total_walk_ins: 7,
          summary: 'Executive brief summary test.',
          key_highlights: ['Peak 9AM', 'Usher deficit'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      );
    }
    // RPC: broadcast_app_notification
    if (url.pathname === '/rest/v1/rpc/broadcast_app_notification') {
      return Promise.resolve(Response.json('mock-notification-id'));
    }
    // Table: app_notification_recipients
    if (url.pathname === '/rest/v1/app_notification_recipients') {
      return Promise.resolve(Response.json([{ user_id: 'oic-user-1' }]));
    }
    // Table: user_push_subscriptions
    if (url.pathname === '/rest/v1/user_push_subscriptions') {
      return Promise.resolve(
        Response.json([
          {
            id: 'sub-1',
            endpoint: 'https://push.example.com/sub/1',
            p256dh_key: 'key-1',
            auth_key: 'auth-1',
          },
        ]),
      );
    }
    // Table: users for resolving OIC role emails
    if (url.pathname === '/rest/v1/users') {
      return Promise.resolve(Response.json([{ email: 'oic@example.com', role: 'OIC' }]));
    }
    // RPC: enqueue_email_notification
    if (url.pathname === '/rest/v1/rpc/enqueue_email_notification') {
      return Promise.resolve(Response.json(1));
    }
    // RPC: trigger_email_processor
    if (url.pathname === '/rest/v1/rpc/trigger_email_processor') {
      return Promise.resolve(Response.json(null));
    }
    // Edge Function: cron-process-email-queue
    if (url.pathname.includes('/cron-process-email-queue')) {
      return Promise.resolve(Response.json({ success: true, processed: 1 }));
    }

    // Google Generative AI API endpoint
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
                    summary:
                      'Paragraph 1: Overall Sunday attendance achieved a 90% turn-up rate, led by a strong 9AM service with 38 attendees.\n\nParagraph 2: Role coverage remained solid in Production and Greeters, while Ushers experienced a minor deficit at 12NN.\n\nParagraph 3: A total of 7 walk-ins were accommodated seamlessly across both slots.',
                    keyHighlights: [
                      'Overall Turn-up: 90%',
                      'Peak Service: 9:00 AM (38 present)',
                      'Minor Usher deficit at 12NN (-2)',
                      '7 Total Walk-ins recorded',
                    ],
                  }),
                },
              ],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 150, candidatesTokenCount: 120, totalTokenCount: 270 },
      };
      return Promise.resolve(Response.json(mockResponseBody));
    }

    return Promise.resolve(new Response('Not Found', { status: 404 }));
  };

  try {
    const { handleCronWeeklySundayDebrief } = await import('../handler.ts');
    await run(handleCronWeeklySundayDebrief);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function request(body: unknown, options: { authHeader?: string; cronKey?: string } = {}) {
  const headers = new Headers({ origin: ORIGIN, 'content-type': 'application/json' });
  if (options.authHeader) {
    headers.set('authorization', options.authHeader);
  }
  if (options.cronKey) {
    headers.set('x-cron-key', options.cronKey);
  }
  return new Request('https://example.functions/cron-weekly-sunday-debrief', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

// 1. Pure Function & Prompt Tests
Deno.test('resolvePreviousSunday returns explicitly provided date', () => {
  assertEquals(resolvePreviousSunday('2026-10-18'), '2026-10-18');
});

Deno.test('resolvePreviousSunday computes previous Sunday from Monday epoch', () => {
  // Monday Oct 19, 2026 at 00:00 UTC (08:00 Manila)
  const mondayEpoch = new Date('2026-10-19T00:00:00Z').getTime();
  const previousSunday = resolvePreviousSunday(undefined, mondayEpoch);
  assertEquals(previousSunday, '2026-10-18');
});

Deno.test('computeSundayMetrics calculates turnup rate, peak slot, and role variances', () => {
  const dashboardStats = {
    time_slots: {
      '9AM': {
        committed: 40,
        present: 36,
        walk_ins: 4,
        late_tardy: 0,
        roles: { Usher: 10, Greeter: 10 },
        committed_roles: { Usher: 12, Greeter: 8 },
      },
      '12NN': {
        committed: 20,
        present: 20,
        walk_ins: 2,
        late_tardy: 1,
        roles: { Usher: 8, Greeter: 6 },
        committed_roles: { Usher: 8, Greeter: 6 },
      },
    },
  };

  const metrics = computeSundayMetrics('2026-10-18', dashboardStats);
  assertEquals(metrics.sundayDate, '2026-10-18');
  assertEquals(metrics.totalCommitted, 60);
  assertEquals(metrics.totalPresent, 56);
  assertEquals(metrics.totalWalkIns, 6);
  assertEquals(metrics.turnupRate, 93.3);
  assertEquals(metrics.peakSlot, '9AM');
  assertEquals(metrics.overallSurplusRoles.length, 1);
  assertEquals(metrics.overallSurplusRoles[0].role, 'Greeter');
  assertEquals(metrics.overallSurplusRoles[0].diff, 2);
  assertEquals(metrics.overallDeficitRoles.length, 1);
  assertEquals(metrics.overallDeficitRoles[0].role, 'Usher');
  assertEquals(metrics.overallDeficitRoles[0].diff, -2);
});

Deno.test('getSystemPrompt enforces 3 distinct paragraphs and structured JSON output', () => {
  const systemPrompt = getSystemPrompt();
  assertMatch(systemPrompt, /PARAGRAPH 1/);
  assertMatch(systemPrompt, /PARAGRAPH 2/);
  assertMatch(systemPrompt, /PARAGRAPH 3/);
  assertMatch(systemPrompt, /keyHighlights/);
});

Deno.test('getUserPrompt formats metrics with slot and role breakdown', () => {
  const prompt = getUserPrompt({
    sundayDate: '2026-10-18',
    turnupRate: 90,
    totalCommitted: 70,
    totalPresent: 63,
    totalWalkIns: 7,
    peakSlot: '9AM',
    slotSummaries: [
      {
        slot: '9AM',
        committed: 40,
        present: 38,
        walkIns: 5,
        turnupRate: 95,
        surplusRoles: [{ role: 'Greeter', diff: 1 }],
        deficitRoles: [{ role: 'Usher', diff: -2 }],
      },
    ],
    overallSurplusRoles: [{ role: 'Greeter', diff: 1, committed: 8, present: 9 }],
    overallDeficitRoles: [{ role: 'Usher', diff: -2, committed: 16, present: 14 }],
  });

  assertMatch(prompt, /Sunday Service Data for 2026-10-18/);
  assertMatch(prompt, /Overall Turn-up Rate: 90%/);
  assertMatch(prompt, /Slot 9AM/);
  assertMatch(prompt, /Usher: 14\/16 \(-2\)/);
});

Deno.test('parseDebriefResponse handles JSON string and code fence wrappers', () => {
  const rawJson = JSON.stringify({
    summary: 'Para 1\n\nPara 2\n\nPara 3',
    keyHighlights: ['Highlight 1', 'Highlight 2'],
  });

  const parsed1 = parseDebriefResponse(rawJson);
  assertEquals(parsed1.summary, 'Para 1\n\nPara 2\n\nPara 3');
  assertEquals(parsed1.keyHighlights.length, 2);

  const wrapped = `\`\`\`json\n${rawJson}\n\`\`\``;
  const parsed2 = parseDebriefResponse(wrapped);
  assertEquals(parsed2.summary, 'Para 1\n\nPara 2\n\nPara 3');
  assertEquals(parsed2.keyHighlights[0], 'Highlight 1');
});

Deno.test(
  'formatSundayDebriefEmailText and formatKeyHighlightsHtml produce valid templates',
  () => {
    const emailParams = {
      sundayDate: '2026-10-18',
      turnupRate: 90.0,
      peakSlot: '9AM',
      totalCommitted: 70,
      totalPresent: 63,
      totalWalkIns: 7,
      summary: 'Executive brief paragraph 1.\n\nExecutive brief paragraph 2.',
      keyHighlights: ['Turn-up at 90%', 'Peak slot 9AM'],
      actionUrl: 'https://welcomehub.app/admin/services',
    };

    const text = formatSundayDebriefEmailText(emailParams);
    assertMatch(text, /CCF Welcome Center — Sunday Executive Debrief \(2026-10-18\)/);
    assertMatch(text, /Turn-up Rate: 90% \| Peak: 9AM/);
    assertMatch(text, /Executive brief paragraph 1/);
    assertMatch(text, /• Turn-up at 90%/);
    assertMatch(text, /https:\/\/welcomehub\.app\/admin\/services/);

    const highlightsHtml = formatKeyHighlightsHtml(emailParams.keyHighlights);
    assertMatch(highlightsHtml, /<ul/);
    assertMatch(
      highlightsHtml,
      /<li style="margin-bottom: 6px; color: #334155;">Turn-up at 90%<\/li>/,
    );
    assertMatch(
      highlightsHtml,
      /<li style="margin-bottom: 6px; color: #334155;">Peak slot 9AM<\/li>/,
    );
  },
);

// 2. HTTP & Edge Function Handler Tests
Deno.test(
  'handleCronWeeklySundayDebrief returns 401 when unauthenticated and missing cron key',
  async () => {
    await withEnv({ apiKey: 'fake-key' }, async (handle) => {
      const res = await handle(request({}));
      assertEquals(res.status, 401);
    });
  },
);

Deno.test('handleCronWeeklySundayDebrief returns 500 when GOOGLE_API_KEY is missing', async () => {
  await withEnv({ apiKey: undefined }, async (handle) => {
    const res = await handle(request({}, { cronKey: 'valid-cron-key' }));
    assertEquals(res.status, 500);
    const body = await res.json();
    assertEquals(body.error, 'AI intelligence service is not configured');
  });
});

Deno.test(
  'handleCronWeeklySundayDebrief successfully generates debrief and broadcasts to role OIC via cron key',
  async () => {
    await withEnv({ apiKey: 'fake-google-api-key' }, async (handle) => {
      const res = await handle(
        request({ sunday_date: '2026-10-18' }, { cronKey: 'valid-cron-key' }),
      );
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.brief.sunday_date, '2026-10-18');
      assertEquals(body.metrics.turnupRate, 90);
      assertEquals(body.metrics.peakSlot, '9AM');
      assertEquals(body.broadcastId, 'mock-notification-id');
      assertEquals(body.pushDeliveries, 1);
      assertEquals(body.emailDeliveries, 1);
    });
  },
);

Deno.test(
  'handleCronWeeklySundayDebrief successfully triggers via admin user bearer token',
  async () => {
    await withEnv({ apiKey: 'fake-google-api-key', role: 'admin' }, async (handle) => {
      const res = await handle(
        request({ sunday_date: '2026-10-18' }, { authHeader: 'Bearer admin-token' }),
      );
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.brief.sunday_date, '2026-10-18');
      assertEquals(body.emailDeliveries, 1);
    });
  },
);
