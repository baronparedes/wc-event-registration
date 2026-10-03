import { assertEquals, assertMatch } from '@std/assert';

import { decodeMemberLookupToken } from '@/shared/memberLookupToken.ts';

import { handleMemberLookup } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
let requestNumber = 0;

const MEMBER = {
  id: USER_ID,
  member_id: 'M-123',
  avatar_object_key: 'avatars/member.png',
  role: 'Usher',
  category: 'member',
  full_name: 'John Smith',
  nickname: 'Jo',
  first_name: 'John',
  last_name: 'Smith',
};

async function withFunctionEnv(run: () => Promise<void>) {
  const names = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ALLOWED_ORIGINS',
    'EDGE_TOKEN_ENCRYPTION_SECRET',
  ];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', TEST_ORIGIN);
  Deno.env.set('EDGE_TOKEN_ENCRYPTION_SECRET', 'test-lookup-token-secret');
  try {
    await run();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function buildRequest(body: unknown) {
  return new Request('https://example.functions/member-lookup', {
    method: 'POST',
    headers: {
      origin: TEST_ORIGIN,
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

type FetchOptions = {
  event?: unknown;
  form?: unknown;
  member?: unknown;
  nameMatches?: unknown[];
  registration?: unknown;
  answers?: unknown[];
  submission?: unknown;
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
    if (url.pathname === '/rest/v1/events') {
      return Promise.resolve(
        Response.json(
          options.event === undefined
            ? { id: EVENT_ID, duplicate_policy: 'block', metadata: { allow_name_lookup: true } }
            : options.event,
        ),
      );
    }
    if (url.pathname === '/rest/v1/forms') {
      return Promise.resolve(
        Response.json(
          options.form === undefined ? { id: 'form-1', duplicate_policy: 'block' } : options.form,
        ),
      );
    }
    if (url.pathname === '/rest/v1/users') {
      return Promise.resolve(
        Response.json(
          url.searchParams.has('member_id')
            ? options.member === undefined
              ? MEMBER
              : options.member
            : (options.nameMatches ?? []),
        ),
      );
    }
    if (url.pathname === '/rest/v1/registrations') {
      return Promise.resolve(Response.json(options.registration ?? null));
    }
    if (url.pathname === '/rest/v1/registration_answers') {
      return Promise.resolve(Response.json(options.answers ?? []));
    }
    if (url.pathname === '/rest/v1/form_submissions') {
      return Promise.resolve(Response.json(options.submission ?? null));
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

Deno.test('member-lookup rejects missing identity and conflicting slugs', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch();
    try {
      assertEquals((await handleMemberLookup(buildRequest({}))).status, 400);
      assertEquals(
        (
          await handleMemberLookup(
            buildRequest({ memberId: 'M-123', eventSlug: 'event', formSlug: 'form' }),
          )
        ).status,
        400,
      );
      assertEquals(fetchMock.calls.length, 0);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('member-lookup masks ID results and issues a scoped lookup token', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch();
    try {
      const response = await handleMemberLookup(
        buildRequest({ memberId: ' M-123 ', eventSlug: 'weekend' }),
      );
      assertEquals(response.status, 200);
      const result = await response.json();
      assertEquals(result.success, true);
      assertEquals(result.profile.first_name, 'Jo**');
      assertEquals(result.profile.last_initial, 'S');
      assertEquals(result.profile.role, 'Usher');
      assertEquals(result.profile.avatar_object_key, 'avatars/member.png');
      assertEquals(result.existing_registration, null);
      assertMatch(result.profile.member_token, /^mlt2\./);
      const token = await decodeMemberLookupToken(result.profile.member_token);
      assertEquals(token?.memberId, MEMBER.member_id);
      assertEquals(token?.eventSlug, 'weekend');
      const memberQuery = fetchMock.calls.find((url) => url.pathname === '/rest/v1/users');
      assertEquals(memberQuery?.searchParams.get('member_id'), 'eq.M-123');
      assertEquals(memberQuery?.searchParams.get('is_active'), 'eq.true');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'member-lookup blocks event name search when disabled before querying users',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        event: { id: EVENT_ID, metadata: { allow_name_lookup: false } },
      });
      try {
        const response = await handleMemberLookup(
          buildRequest({ name: 'John Smith', eventSlug: 'weekend' }),
        );
        assertEquals(await response.json(), {
          success: true,
          profile: null,
          existing_registration: null,
          existing_submission: null,
        });
        assertEquals(
          fetchMock.calls.map((url) => url.pathname),
          ['/rest/v1/events'],
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('member-lookup withholds ambiguous names and matches a unique nickname', async () => {
  await withFunctionEnv(async () => {
    const ambiguous = mockFetch({
      nameMatches: [MEMBER, { ...MEMBER, id: 'user-2', member_id: 'M-456' }],
    });
    try {
      const response = await handleMemberLookup(buildRequest({ name: 'Jo Smith' }));
      assertEquals((await response.json()).profile, null);
      const nameQuery = ambiguous.calls.find((url) => url.pathname === '/rest/v1/users');
      assertEquals(nameQuery?.searchParams.get('last_name'), 'not.is.null');
      assertEquals(nameQuery?.searchParams.get('limit'), '200');
    } finally {
      ambiguous.restore();
    }

    const unique = mockFetch({
      nameMatches: [
        MEMBER,
        { ...MEMBER, id: 'user-2', member_id: 'M-456', first_name: 'Jane', nickname: 'Jay' },
      ],
    });
    try {
      const response = await handleMemberLookup(buildRequest({ name: 'Jo Smith' }));
      assertEquals((await response.json()).profile.first_name, 'Jo**');
    } finally {
      unique.restore();
    }
  });
});

Deno.test(
  'member-lookup restores existing registration answers without coercing text',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        event: { id: EVENT_ID, duplicate_policy: 'allow_update', metadata: {} },
        registration: { id: 'registration-1', status: 'submitted' },
        answers: [
          {
            answer_text: '12',
            answer_number: null,
            answer_boolean: null,
            answer_date: null,
            answer_json: null,
            event_fields: { field_key: 'age_label', field_type: 'text' },
          },
          {
            answer_text: null,
            answer_number: 3,
            answer_boolean: null,
            answer_date: null,
            answer_json: null,
            event_fields: { field_key: 'guests', field_type: 'number' },
          },
        ],
      });
      try {
        const response = await handleMemberLookup(
          buildRequest({ memberId: 'M-123', eventSlug: 'weekend' }),
        );
        assertEquals(response.status, 200);
        assertEquals((await response.json()).existing_registration, {
          exists: true,
          edit_allowed: true,
          status: 'submitted',
          responses: { age_label: '12', guests: 3 },
        });
        const registrationQuery = fetchMock.calls.find(
          (url) => url.pathname === '/rest/v1/registrations',
        );
        assertEquals(registrationQuery?.searchParams.get('registration_scope_key'), 'eq.primary');
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('member-lookup skips registration lookup for multiple-submission events', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      event: { id: EVENT_ID, duplicate_policy: 'allow_multiple', metadata: {} },
    });
    try {
      const response = await handleMemberLookup(
        buildRequest({ memberId: 'M-123', eventSlug: 'weekend' }),
      );
      assertEquals((await response.json()).existing_registration, null);
      assertEquals(
        fetchMock.calls.some((url) => url.pathname === '/rest/v1/registrations'),
        false,
      );
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('member-lookup restores existing form submissions for published forms', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      form: { id: 'form-1', duplicate_policy: 'allow_update' },
      submission: {
        id: 'submission-1',
        status: 'updated',
        form_submission_answers: [
          {
            answer_text: '12',
            answer_number: null,
            answer_boolean: null,
            answer_date: null,
            answer_json: null,
            form_fields: { field_key: 'code', field_type: 'text' },
          },
        ],
      },
    });
    try {
      const response = await handleMemberLookup(
        buildRequest({ memberId: 'M-123', formSlug: 'signup' }),
      );
      assertEquals(response.status, 200);
      assertEquals((await response.json()).existing_submission, {
        exists: true,
        edit_allowed: true,
        status: 'updated',
        responses: { code: '12' },
      });
      const formQuery = fetchMock.calls.find((url) => url.pathname === '/rest/v1/forms');
      assertEquals(formQuery?.searchParams.get('status'), 'eq.published');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('member-lookup maps event, name, registration and answer lookup failures', async () => {
  await withFunctionEnv(async () => {
    for (const failPath of [
      '/rest/v1/events',
      '/rest/v1/users',
      '/rest/v1/registrations',
      '/rest/v1/registration_answers',
    ]) {
      const fetchMock = mockFetch({
        failPath,
        event: { id: EVENT_ID, duplicate_policy: 'block', metadata: { allow_name_lookup: true } },
        registration: { id: 'registration-1', status: 'submitted' },
      });
      try {
        const request =
          failPath === '/rest/v1/users'
            ? { name: 'Jo Smith', eventSlug: 'weekend' }
            : { memberId: 'M-123', eventSlug: 'weekend' };
        const response = await handleMemberLookup(buildRequest(request));
        assertEquals(response.status, 500);
      } finally {
        fetchMock.restore();
      }
    }
  });
});

Deno.test('member-lookup rejects lookup when event is public-only', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      event: {
        id: EVENT_ID,
        duplicate_policy: 'block',
        allow_public_registrations: true,
        require_id_lookup: false,
        metadata: { public_registration_access: 'public' },
      },
    });
    try {
      const response = await handleMemberLookup(
        buildRequest({ memberId: 'M-123', eventSlug: 'public-event' }),
      );
      assertEquals(response.status, 400);
      const json = await response.json();
      assertEquals(json.success, false);
      assertEquals(json.error, 'Member registration is not allowed for this event');
    } finally {
      fetchMock.restore();
    }
  });
});
