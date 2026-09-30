import { assertEquals } from '@std/assert';

import { handleCronUpcomingSundayExcusedExportEmail } from '../handler.ts';

const SERVICE_ROLE_KEY = 'test-service-role-key';
const TEST_ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const REGISTRATION_ID = '22222222-2222-4222-8222-222222222222';
const TARGET_DATE = '2026-10-04';

const EVENT_FIELDS = [
  { id: 'field-request-date', field_key: 'request_date' },
  { id: 'field-services', field_key: 'services' },
  { id: 'field-reason', field_key: 'reason' },
];

async function withFunctionEnv(run: () => Promise<void>) {
  const envNames = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CRON_ROLE_KEY',
    'ALLOWED_ORIGINS',
    'RESEND_API_KEY',
    'UPCOMING_SUNDAY_TARGET_EMAIL',
    'EXCUSE_REQUEST_EVENT_ID',
    'RESEND_FROM_EMAIL',
  ];
  const previousValues = new Map(envNames.map((name) => [name, Deno.env.get(name)]));

  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
  Deno.env.set('CRON_ROLE_KEY', 'test-cron-role-key');
  Deno.env.set('ALLOWED_ORIGINS', TEST_ORIGIN);
  Deno.env.set('RESEND_API_KEY', 'test-resend-key');
  Deno.env.set('UPCOMING_SUNDAY_TARGET_EMAIL', 'reports@example.com');
  Deno.env.set('EXCUSE_REQUEST_EVENT_ID', EVENT_ID);
  Deno.env.set('RESEND_FROM_EMAIL', 'events@example.com');

  try {
    await run();
  } finally {
    for (const [name, value] of previousValues) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

let requestNumber = 0;

function buildRequest(authorized = true, cronAuthorized = false) {
  const headers = new Headers({ origin: TEST_ORIGIN, 'content-type': 'application/json' });
  if (authorized) headers.set('authorization', `Bearer ${SERVICE_ROLE_KEY}`);
  if (cronAuthorized) headers.set('x-cron-key', 'test-cron-role-key');
  headers.set('x-forwarded-for', `198.51.100.${++requestNumber}`);
  return new Request(
    `https://example.functions/cron-upcoming-sunday-excused-export-email?target_sunday_date=${TARGET_DATE}`,
    { method: 'POST', headers, body: '{}' },
  );
}

function mockFetch(options: {
  requestDateAnswers?: Array<{ registration_id: string }>;
  registrations?: Array<Record<string, unknown>>;
  answers?: Array<Record<string, unknown>>;
  resendStatus?: number;
}) {
  const originalFetch = globalThis.fetch;
  const sentEmails: Array<Record<string, unknown>> = [];

  globalThis.fetch = (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    if (requestUrl.pathname === '/rest/v1/event_fields') {
      return Promise.resolve(Response.json(EVENT_FIELDS));
    }
    if (requestUrl.pathname === '/rest/v1/registration_answers') {
      const selection = requestUrl.searchParams.get('select');
      const rows =
        selection === 'registration_id'
          ? (options.requestDateAnswers ?? [])
          : (options.answers ?? []);
      return Promise.resolve(Response.json(rows));
    }
    if (requestUrl.pathname === '/rest/v1/registrations') {
      return Promise.resolve(Response.json(options.registrations ?? []));
    }
    if (requestUrl.hostname === 'api.resend.com') {
      sentEmails.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return Promise.resolve(new Response(null, { status: options.resendStatus ?? 200 }));
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    sentEmails,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

function readAttachmentContent(email: Record<string, unknown>): string {
  const attachments = email.attachments as Array<{ content: string }>;
  const binary = atob(attachments[0].content);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

Deno.test('cron-upcoming-sunday-excused-export-email requires an authorized caller', async () => {
  await withFunctionEnv(async () => {
    const response = await handleCronUpcomingSundayExcusedExportEmail(buildRequest(false));
    assertEquals(response.status, 401);
  });
});

Deno.test('cron-upcoming-sunday-excused-export-email accepts the cron role key', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ requestDateAnswers: [] });
    try {
      const response = await handleCronUpcomingSundayExcusedExportEmail(buildRequest(false, true));
      assertEquals(response.status, 200);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'cron-upcoming-sunday-excused-export-email sends an empty export when no requests match',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({ requestDateAnswers: [] });
      try {
        const response = await handleCronUpcomingSundayExcusedExportEmail(buildRequest());
        const email = fetchMock.sentEmails[0];
        assertEquals(response.status, 200);
        assertEquals(await response.json(), {
          success: true,
          records: 0,
          targetDate: TARGET_DATE,
        });
        assertEquals(email.to, ['reports@example.com']);
        assertEquals(
          (email.attachments as Array<{ filename: string }>)[0].filename,
          `sunday-excuse-requests-${TARGET_DATE}.json`,
        );
        assertEquals(readAttachmentContent(email), '[]');
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'cron-upcoming-sunday-excused-export-email maps registration answers into the attachment',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        requestDateAnswers: [{ registration_id: REGISTRATION_ID }],
        registrations: [
          {
            id: REGISTRATION_ID,
            users: {
              first_name: '  Jamie ',
              last_name: ' Lee  ',
              email: ' jamie@example.com ',
            },
          },
        ],
        answers: [
          {
            registration_id: REGISTRATION_ID,
            event_field_id: 'field-services',
            answer_text: '["9AM","12NN"]',
            answer_number: null,
            answer_boolean: null,
            answer_date: null,
            answer_json: null,
          },
          {
            registration_id: REGISTRATION_ID,
            event_field_id: 'field-reason',
            answer_text: 'Family matter',
            answer_number: null,
            answer_boolean: null,
            answer_date: null,
            answer_json: null,
          },
        ],
      });
      try {
        const response = await handleCronUpcomingSundayExcusedExportEmail(buildRequest());
        const email = fetchMock.sentEmails[0];
        assertEquals(response.status, 200);
        assertEquals((await response.json()).row_count, 1);
        assertEquals(JSON.parse(readAttachmentContent(email)), [
          {
            firstName: 'Jamie',
            lastName: 'Lee',
            requestDate: TARGET_DATE,
            services: '9AM, 12NN',
            reason: 'Family matter',
            email: 'jamie@example.com',
          },
        ]);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'cron-upcoming-sunday-excused-export-email reports a Resend delivery failure',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({ requestDateAnswers: [], resendStatus: 503 });
      try {
        const response = await handleCronUpcomingSundayExcusedExportEmail(buildRequest());
        assertEquals(response.status, 502);
        assertEquals((await response.json()).resend_status, 503);
      } finally {
        fetchMock.restore();
      }
    });
  },
);
