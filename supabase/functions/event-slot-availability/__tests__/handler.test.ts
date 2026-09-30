import { assertEquals } from '@std/assert';

import { handleEventSlotAvailability } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';

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

function buildRequest(eventId = EVENT_ID) {
  return new Request('https://example.functions/event-slot-availability', {
    method: 'POST',
    headers: { origin: TEST_ORIGIN, 'content-type': 'application/json' },
    body: JSON.stringify({ event_id: eventId }),
  });
}

type Answer = {
  answer_text: string | null;
  answer_json: unknown;
  registrations?: { user_id: string | null };
};

type Field = {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  options: Array<{ value: string; label: string }>;
  validation_rules: Record<string, unknown> | null;
};

function field(id: string, validationRules: Record<string, unknown> | null): Field {
  return {
    id,
    field_key: id,
    label: `Choose ${id}`,
    field_type: 'select',
    options: [
      { value: 'morning', label: 'Morning' },
      { value: 'evening', label: 'Evening' },
    ],
    validation_rules: validationRules,
  };
}

type FetchOptions = {
  fields?: Field[];
  answers?: Record<string, Answer[]>;
  publicAnswers?: Record<string, Answer[]>;
  users?: Array<{ id: string; role: string }>;
  failPath?: string;
};

function mockFetch(options: FetchOptions = {}) {
  const originalFetch = globalThis.fetch;
  const calls: URL[] = [];
  globalThis.fetch = (input) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    calls.push(url);
    if (url.pathname === options.failPath) {
      return Promise.resolve(Response.json({ message: 'lookup failed' }, { status: 500 }));
    }
    if (url.pathname === '/rest/v1/event_fields') {
      return Promise.resolve(Response.json(options.fields ?? []));
    }
    if (url.pathname === '/rest/v1/registration_answers') {
      const id = url.searchParams.get('event_field_id')?.replace(/^eq\./, '') ?? '';
      return Promise.resolve(Response.json(options.answers?.[id] ?? []));
    }
    if (url.pathname === '/rest/v1/public_registration_answers') {
      const id = url.searchParams.get('event_field_id')?.replace(/^eq\./, '') ?? '';
      return Promise.resolve(Response.json(options.publicAnswers?.[id] ?? []));
    }
    if (url.pathname === '/rest/v1/users') {
      return Promise.resolve(Response.json(options.users ?? []));
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

Deno.test('event-slot-availability rejects invalid event IDs', async () => {
  await withFunctionEnv(async () => {
    const response = await handleEventSlotAvailability(buildRequest('invalid'));
    assertEquals(response.status, 400);
  });
});

Deno.test('event-slot-availability skips unconstrained fields', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ fields: [field('unlimited', null)] });
    try {
      const response = await handleEventSlotAvailability(buildRequest());
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true, event_id: EVENT_ID, fields: [] });
      assertEquals(
        fetchMock.calls.map((url) => url.pathname),
        ['/rest/v1/event_fields'],
      );
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'event-slot-availability counts member and public answers for ordinary slots',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        fields: [field('session', { max_slots: { morning: 3 } })],
        answers: {
          session: [
            { answer_text: 'morning', answer_json: null, registrations: { user_id: null } },
          ],
        },
        publicAnswers: { session: [{ answer_text: 'morning', answer_json: null }] },
      });
      try {
        const response = await handleEventSlotAvailability(buildRequest());
        assertEquals(response.status, 200);
        assertEquals(await response.json(), {
          success: true,
          event_id: EVENT_ID,
          fields: [
            {
              field_id: 'session',
              field_key: 'session',
              field_label: 'Choose session',
              options: [
                {
                  value: 'morning',
                  label: 'Morning',
                  allotted_slots: 3,
                  used_slots: 2,
                  remaining_slots: 1,
                },
              ],
            },
          ],
        });
        const memberLookup = fetchMock.calls.find(
          (url) => url.pathname === '/rest/v1/registration_answers',
        );
        const publicLookup = fetchMock.calls.find(
          (url) => url.pathname === '/rest/v1/public_registration_answers',
        );
        assertEquals(memberLookup?.searchParams.get('registrations.status'), 'neq.cancelled');
        assertEquals(
          publicLookup?.searchParams.get('public_registrations.status'),
          'neq.cancelled',
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'event-slot-availability only counts members assigned to role-restricted slots',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        fields: [
          field('team', {
            max_slots: { morning: 99 },
            max_slots_role_allotments: {
              morning: [
                { role: 'Usher', alloted_slots: 2 },
                { role: 'Prayer Coach', alloted_slots: 1 },
              ],
            },
          }),
        ],
        answers: {
          team: [
            { answer_text: 'morning', answer_json: null, registrations: { user_id: 'user-1' } },
            { answer_text: 'morning', answer_json: null, registrations: { user_id: 'user-2' } },
            { answer_text: 'morning', answer_json: null, registrations: { user_id: 'user-3' } },
          ],
        },
        publicAnswers: { team: [{ answer_text: 'morning', answer_json: null }] },
        users: [
          { id: 'user-1', role: 'Usher / VMT Support' },
          { id: 'user-2', role: 'Prayer Coach' },
          { id: 'user-3', role: 'Other' },
        ],
      });
      try {
        const response = await handleEventSlotAvailability(buildRequest());
        assertEquals(response.status, 200);
        assertEquals((await response.json()).fields[0].options, [
          {
            value: 'morning',
            label: 'Morning',
            allotted_slots: 3,
            used_slots: 2,
            remaining_slots: 1,
            remaining_slots_by_role: { usher: 1, 'prayer coach': 0 },
          },
        ]);
        const roleLookup = fetchMock.calls.find((url) => url.pathname === '/rest/v1/users');
        assertEquals(roleLookup?.searchParams.get('id'), 'in.(user-1,user-2,user-3)');
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('event-slot-availability maps field and answer lookup errors', async () => {
  await withFunctionEnv(async () => {
    for (const failPath of [
      '/rest/v1/event_fields',
      '/rest/v1/registration_answers',
      '/rest/v1/public_registration_answers',
      '/rest/v1/users',
    ]) {
      const fetchMock = mockFetch({
        fields: [field('session', { max_slots: { morning: 2 } })],
        answers: {
          session: [
            { answer_text: 'morning', answer_json: null, registrations: { user_id: 'user-1' } },
          ],
        },
        failPath,
      });
      try {
        const response = await handleEventSlotAvailability(buildRequest());
        assertEquals(response.status, 500);
      } finally {
        fetchMock.restore();
      }
    }
  });
});
