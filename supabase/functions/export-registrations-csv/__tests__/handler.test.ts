import { assertEquals, assertStringIncludes } from '@std/assert';

import { handleExportRegistrationsCsv } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';

async function withFunctionEnv(run: () => Promise<void>) {
  const envNames = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'];
  const previousValues = new Map(envNames.map((name) => [name, Deno.env.get(name)]));
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
  const headers = new Headers({ origin: TEST_ORIGIN, 'content-type': 'application/json' });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');
  return new Request('https://example.functions/export-registrations-csv', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { registrationsError?: boolean }) {
  const originalFetch = globalThis.fetch;
  const auditRows: Array<Record<string, unknown>> = [];
  const adminUserId = crypto.randomUUID();

  globalThis.fetch = (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: adminUserId }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: 'slod' }));
    }
    if (requestUrl.pathname === '/rest/v1/events') {
      return Promise.resolve(Response.json({ title: 'Annual, Gathering' }));
    }
    if (requestUrl.pathname === '/rest/v1/registrations') {
      if (options.registrationsError) {
        return Promise.resolve(
          Response.json({ message: 'registrations unavailable' }, { status: 500 }),
        );
      }
      return Promise.resolve(
        Response.json([
          {
            id: 'registration-1',
            user_id: 'user-1',
            status: 'submitted',
            submitted_at: '2026-09-01T10:00:00.000Z',
            updated_at: '2026-09-02T10:00:00.000Z',
          },
        ]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/users') {
      return Promise.resolve(
        Response.json([
          {
            id: 'user-1',
            member_id: 'M-001',
            full_name: 'Alex, "AJ" Member',
            email: 'alex@example.com',
            phone: '09170000000',
            role: 'attendee',
            category: 'member',
            metadata: { zeta: 'last', alpha: 'first', empty: '' },
          },
        ]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/event_fields') {
      return Promise.resolve(
        Response.json([
          {
            id: 'field-meals',
            field_key: 'meals',
            label: 'Meal Choices',
            field_type: 'multi_select',
          },
          {
            id: 'field-confirmed',
            field_key: 'confirmed',
            label: 'Confirmed',
            field_type: 'boolean',
          },
        ]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/registration_answers') {
      return Promise.resolve(
        Response.json([
          {
            registration_id: 'registration-1',
            event_field_id: 'field-meals',
            answer_text: '["Vegetarian","No nuts"]',
            answer_number: null,
            answer_boolean: null,
            answer_date: null,
            answer_json: null,
          },
          {
            registration_id: 'registration-1',
            event_field_id: 'field-confirmed',
            answer_text: 'true',
            answer_number: null,
            answer_boolean: null,
            answer_date: null,
            answer_json: null,
          },
        ]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/admin_audit_logs') {
      auditRows.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return Promise.resolve(new Response(null, { status: 201 }));
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    adminUserId,
    auditRows,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test(
  'export-registrations-csv validates event_id and requires an authorized user',
  async () => {
    await withFunctionEnv(async () => {
      const invalid = await handleExportRegistrationsCsv(buildRequest({ event_id: 'bad' }));
      const unauthorized = await handleExportRegistrationsCsv(
        buildRequest({ event_id: EVENT_ID }, false),
      );
      assertEquals(invalid.status, 400);
      assertEquals(unauthorized.status, 401);
    });
  },
);

Deno.test('export-registrations-csv formats CSV answers and records an audit row', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({});
    try {
      const response = await handleExportRegistrationsCsv(buildRequest({ event_id: EVENT_ID }));
      const csv = await response.text();
      assertEquals(response.status, 200);
      assertEquals(response.headers.get('content-type'), 'text/csv; charset=utf-8');
      assertStringIncludes(
        response.headers.get('content-disposition') ?? '',
        'annual-gathering-registrations-',
      );
      assertStringIncludes(
        csv,
        'Member Id,Full Name,Email,Phone,Role,Category,Status,Submitted At,Updated At,Meal Choices,Confirmed',
      );
      assertStringIncludes(csv, '"Alex, ""AJ"" Member"');
      assertStringIncludes(csv, 'Vegetarian; No nuts,true');
      assertEquals(fetchMock.auditRows.length, 1);
      assertEquals(fetchMock.auditRows[0].action, 'export_registrations_csv');
      assertEquals(fetchMock.auditRows[0].admin_id, 'admin-row');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'export-registrations-csv returns names_json rows and audits the names export',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({});
      try {
        const response = await handleExportRegistrationsCsv(
          buildRequest({ event_id: EVENT_ID, response_mode: 'names_json' }),
        );
        const body = await response.json();
        assertEquals(response.status, 200);
        assertEquals(response.headers.get('content-type'), 'application/json');
        assertEquals(body.row_count, 1);
        assertEquals(body.answer_fields, [
          { field_id: 'field-meals', label: 'Meal Choices' },
          { field_id: 'field-confirmed', label: 'Confirmed' },
        ]);
        assertEquals(body.rows[0].metadata, 'alpha: first; zeta: last');
        assertEquals(body.rows[0].answer_values, {
          'field-meals': 'Vegetarian; No nuts',
          'field-confirmed': 'true',
        });
        assertEquals(fetchMock.auditRows[0].action, 'export_registration_names');
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('export-registrations-csv maps registration query failures', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ registrationsError: true });
    try {
      const response = await handleExportRegistrationsCsv(buildRequest({ event_id: EVENT_ID }));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to fetch registrations');
      assertEquals(fetchMock.auditRows, []);
    } finally {
      fetchMock.restore();
    }
  });
});
