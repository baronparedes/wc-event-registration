import { assertEquals } from '@std/assert';

import { handleUpdateRecruitmentSettings } from '../handler.ts';

const ORIGIN = 'https://app.example.com';
const USER_ID = '11111111-1111-4111-8111-111111111111';
let requestNumber = 0;

const settings = {
  is_recruitment_open: true,
  eligibility_rules: {
    min_age: 18,
    max_age: 45,
    requires_glc1_completed: true,
    min_dgroup_months: 6,
  },
  vmt_registration_url: 'https://example.com/vmt',
  orientation_instructions: 'Attend the scheduled orientation.',
  survey_questions: [
    {
      field_key: 'survey_q1',
      label: 'Test survey question',
      field_type: 'radio',
      is_required: true,
      is_active: true,
      correct_answer: 'true',
    },
  ],
  endorsement_questions: [
    {
      field_key: 'endorsement_q1',
      label: 'Test endorsement question',
      field_type: 'multi_select_toggle',
      is_required: true,
      is_active: true,
      options: [{ label: 'Yes', value: 'yes', toggle_label: 'Add details', toggle_default: true }],
    },
  ],
};

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

function createRequest(role: string, payload: unknown = settings) {
  return new Request('https://example.functions/update-recruitment-settings', {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      authorization: 'Bearer valid-access-token',
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
      'x-test-role': role,
    },
    body: JSON.stringify(payload),
  });
}

function mockFetch(options?: { failUpdate?: boolean; role?: string }) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; method: string; body: unknown }> = [];
  globalThis.fetch = (input, init) => {
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
    if (url.pathname === '/rest/v1/recruitment_settings') {
      if (options?.failUpdate) {
        return Promise.resolve(Response.json({ message: 'write failed' }, { status: 500 }));
      }
      return Promise.resolve(
        Response.json({ ...settings, id: 1, updated_at: '2026-11-02T00:00:00Z' }),
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

Deno.test('update-recruitment-settings persists validated settings for an admin', async () => {
  await withEnv(async () => {
    const mock = mockFetch();
    try {
      const response = await handleUpdateRecruitmentSettings(createRequest('admin'));

      assertEquals(response.status, 200);
      const body = await response.json();
      assertEquals(body.success, true);
      assertEquals(body.settings.is_recruitment_open, true);
      const updateCall = mock.calls.find(
        (call) => call.path === '/rest/v1/recruitment_settings' && call.method === 'PATCH',
      );
      const updateBody = updateCall?.body as
        | {
            endorsement_questions?: Array<{
              options?: Array<{ toggle_label?: string; toggle_default?: boolean }>;
            }>;
          }
        | undefined;
      assertEquals(
        updateBody?.endorsement_questions?.[0]?.options?.[0]?.toggle_label,
        'Add details',
      );
      assertEquals(updateBody?.endorsement_questions?.[0]?.options?.[0]?.toggle_default, true);
      assertEquals(
        mock.calls.some(
          (call) => call.path === '/rest/v1/recruitment_settings' && call.method === 'PATCH',
        ),
        true,
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-settings rejects empty question banks before writing', async () => {
  await withEnv(async () => {
    const mock = mockFetch();
    try {
      for (const payload of [
        { ...settings, survey_questions: [] },
        { ...settings, endorsement_questions: [] },
      ]) {
        const response = await handleUpdateRecruitmentSettings(createRequest('admin', payload));
        assertEquals(response.status, 400);
      }

      assertEquals(
        mock.calls.some((call) => call.path === '/rest/v1/recruitment_settings'),
        false,
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-settings rejects VMT before writing', async () => {
  await withEnv(async () => {
    const mock = mockFetch({ role: 'vmt' });
    try {
      const response = await handleUpdateRecruitmentSettings(createRequest('vmt'));

      assertEquals(response.status, 401);
      assertEquals(
        mock.calls.some((call) => call.path === '/rest/v1/recruitment_settings'),
        false,
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-settings rejects malformed settings before writing', async () => {
  await withEnv(async () => {
    const mock = mockFetch();
    try {
      const response = await handleUpdateRecruitmentSettings(
        createRequest('admin', {
          ...settings,
          eligibility_rules: { ...settings.eligibility_rules, max_age: 17 },
        }),
      );

      assertEquals(response.status, 400);
      assertEquals(
        mock.calls.some((call) => call.path === '/rest/v1/recruitment_settings'),
        false,
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-settings reports database failures', async () => {
  await withEnv(async () => {
    const mock = mockFetch({ failUpdate: true });
    try {
      const response = await handleUpdateRecruitmentSettings(createRequest('admin'));

      assertEquals(response.status, 500);
      const body = await response.json();
      assertEquals(body.success, false);
    } finally {
      mock.restore();
    }
  });
});
