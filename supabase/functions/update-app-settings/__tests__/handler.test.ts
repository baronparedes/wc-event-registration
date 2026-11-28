import { assertEquals } from '@std/assert';

import {
  DEFAULT_LONG_LEAVE_POLICY,
  DEFAULT_WEEKLY_DEBRIEF_CONFIG,
  forecastConfidenceThresholdsSchema,
  longLeavePolicySchema,
  serviceStaffingTargetsSchema,
  serviceTimeSlotsSchema,
  volunteerRolesSchema,
  weeklyDebriefConfigSchema,
} from '@/shared/appSettings.ts';

import { handleUpdateAppSettings } from '../handler.ts';

const USER_ID = '11111111-1111-4111-8111-111111111111';

async function withEnv(run: () => Promise<void>) {
  const keys = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'APP_ENV',
    'ALLOWED_ORIGINS',
    'ENVIRONMENT',
  ];
  const previous = new Map<string, string | undefined>();
  for (const key of keys) previous.set(key, Deno.env.get(key));

  Deno.env.set('SUPABASE_URL', 'https://project.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
  Deno.env.set('APP_ENV', 'development');
  Deno.env.set('ALLOWED_ORIGINS', 'http://localhost:5173');
  Deno.env.set('ENVIRONMENT', 'local');

  try {
    await run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

function createRequest(body: unknown, token = 'admin-token') {
  return new Request('https://project.supabase.co/functions/v1/update-app-settings', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

function mockFetch(options?: { role?: string; failUpsert?: boolean }) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; method: string; body: unknown }> = [];

  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = init?.method ?? 'GET';
    const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : null;
    calls.push({ path: url.pathname, method, body });

    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: USER_ID, email: 'admin@example.com' }));
    }
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: USER_ID, role: options?.role ?? 'admin' }));
    }
    if (url.pathname === '/rest/v1/admin_role_permissions') {
      const role = options?.role ?? 'admin';
      const allowed = role === 'admin' || role === 'super_admin';
      return Promise.resolve(Response.json(allowed ? [{ permission: 'canWriteAdminData' }] : []));
    }
    if (url.pathname === '/rest/v1/app_settings') {
      if (options?.failUpsert) {
        return Promise.resolve(Response.json({ message: 'db write error' }, { status: 500 }));
      }
      const payload = body as { key?: string; value?: unknown; is_public?: boolean } | null;
      return Promise.resolve(
        Response.json({
          key: payload?.key ?? 'long_leave_policy',
          value: payload?.value ?? DEFAULT_LONG_LEAVE_POLICY,
          is_public: payload?.is_public ?? true,
          description: '',
          updated_at: '2026-11-28T00:00:00Z',
          updated_by: USER_ID,
        }),
      );
    }
    return Promise.resolve(Response.json([]));
  };

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('appSettings schemas validate valid payloads and reject invalid ones', () => {
  assertEquals(longLeavePolicySchema.safeParse(DEFAULT_LONG_LEAVE_POLICY).success, true);
  assertEquals(weeklyDebriefConfigSchema.safeParse(DEFAULT_WEEKLY_DEBRIEF_CONFIG).success, true);

  assertEquals(
    forecastConfidenceThresholdsSchema.safeParse({
      solid: 0.7,
      moderate: 0.4,
      default_turnup_rate: 0.8,
    }).success,
    true,
  );
  assertEquals(
    forecastConfidenceThresholdsSchema.safeParse({
      solid: 0.3,
      moderate: 0.6,
      default_turnup_rate: 0.8,
    }).success,
    false,
  );

  assertEquals(
    serviceStaffingTargetsSchema.safeParse({
      '9AM': { Usher: 17, 'Prayer Coach': 50 },
    }).success,
    true,
  );
  assertEquals(
    serviceStaffingTargetsSchema.safeParse({
      '9AM': { Usher: -1 },
    }).success,
    false,
  );

  assertEquals(
    serviceTimeSlotsSchema.safeParse([
      { key: '9AM', label: '9:00 AM', sort_order: 1, is_active: true },
    ]).success,
    true,
  );
  assertEquals(
    volunteerRolesSchema.safeParse([
      {
        key: 'Usher',
        label: 'Usher',
        sort_order: 1,
        is_active: true,
        is_recruitment_enabled: true,
        is_staffing_target: true,
      },
    ]).success,
    true,
  );
});

Deno.test('update-app-settings upserts public and private settings for admin', async () => {
  await withEnv(async () => {
    const mock = mockFetch({ role: 'admin' });
    try {
      const publicRes = await handleUpdateAppSettings(
        createRequest({
          key: 'long_leave_policy',
          value: { min_days: 35, min_weeks: 5, require_sunday_dates: true },
        }),
      );
      assertEquals(publicRes.status, 200);
      const publicBody = await publicRes.json();
      assertEquals(publicBody.success, true);
      assertEquals(publicBody.setting.is_public, true);

      const privateRes = await handleUpdateAppSettings(
        createRequest({
          key: 'weekly_debrief_config',
          value: { recipient_roles: ['OIC', 'admin'] },
        }),
      );
      assertEquals(privateRes.status, 200);
      const privateBody = await privateRes.json();
      assertEquals(privateBody.success, true);
      assertEquals(privateBody.setting.is_public, false);
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-app-settings rejects non-admin roles before writing', async () => {
  await withEnv(async () => {
    const mock = mockFetch({ role: 'slod' });
    try {
      const response = await handleUpdateAppSettings(
        createRequest({
          key: 'weekly_debrief_config',
          value: { recipient_roles: ['OIC'] },
        }),
      );
      assertEquals(response.status, 401);
      assertEquals(
        mock.calls.some((call) => call.path === '/rest/v1/app_settings'),
        false,
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-app-settings rejects invalid payloads with 400', async () => {
  await withEnv(async () => {
    const mock = mockFetch({ role: 'admin' });
    try {
      const response = await handleUpdateAppSettings(
        createRequest({
          key: 'forecast_confidence_thresholds',
          value: { solid: 0.2, moderate: 0.5, default_turnup_rate: 0.8 },
        }),
      );
      assertEquals(response.status, 400);
      assertEquals(
        mock.calls.some((call) => call.path === '/rest/v1/app_settings'),
        false,
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-app-settings reports database errors with 500', async () => {
  await withEnv(async () => {
    const mock = mockFetch({ role: 'admin', failUpsert: true });
    try {
      const response = await handleUpdateAppSettings(
        createRequest({
          key: 'long_leave_policy',
          value: { min_days: 28, min_weeks: 4, require_sunday_dates: true },
        }),
      );
      assertEquals(response.status, 500);
      const body = await response.json();
      assertEquals(body.success, false);
    } finally {
      mock.restore();
    }
  });
});
