import { assertEquals } from '@std/assert';

const ORIGIN = 'https://app.example.com';
const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const RECIPIENT_ID = '22222222-2222-4222-8222-222222222222';
const NOTIFICATION_ID = '33333333-3333-4333-8333-333333333333';

async function withEnv(run: (handle: (req: Request) => Promise<Response>) => Promise<void>) {
  const names = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ALLOWED_ORIGINS',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
  ];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', ORIGIN);
  Deno.env.delete('VAPID_PUBLIC_KEY');
  Deno.env.delete('VAPID_PRIVATE_KEY');
  try {
    const { handleSendAppNotification } = await import('../handler.ts');
    await run(handleSendAppNotification);
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function request(body: unknown, authenticated = true) {
  const headers = new Headers({ origin: ORIGIN, 'content-type': 'application/json' });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');
  return new Request('https://example.functions/send-app-notification', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function payload(overrides: Record<string, unknown> = {}) {
  return { title: 'Event update', message: 'Doors open at nine.', targetType: 'all', ...overrides };
}

function mockFetch(
  options: {
    role?: string;
    broadcastError?: boolean;
    recipientError?: boolean;
    recipients?: string[];
    notificationId?: string | null;
  } = {},
) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; url: URL; body: unknown }> = [];
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    calls.push({
      path: url.pathname,
      url,
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : null,
    });
    if (url.pathname === '/auth/v1/user') return Promise.resolve(Response.json({ id: ADMIN_ID }));
    if (url.pathname === '/rest/v1/admins')
      return Promise.resolve(Response.json({ id: 'admin-row', role: options.role ?? 'admin' }));
    if (url.pathname === '/rest/v1/rpc/broadcast_app_notification') {
      return Promise.resolve(
        options.broadcastError
          ? Response.json({ message: 'broadcast failed' }, { status: 500 })
          : Response.json(
              options.notificationId === undefined ? NOTIFICATION_ID : options.notificationId,
            ),
      );
    }
    if (url.pathname === '/rest/v1/app_notification_recipients') {
      return Promise.resolve(
        options.recipientError
          ? Response.json({ message: 'recipient lookup failed' }, { status: 500 })
          : Response.json(
              (options.recipients ?? [RECIPIENT_ID]).map((userId) => ({ user_id: userId })),
            ),
      );
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

Deno.test('send-app-notification validates input and requires an admin', async () => {
  await withEnv(async (handle) => {
    assertEquals((await handle(request(payload({ title: '' })))).status, 400);
    assertEquals((await handle(request(payload(), false))).status, 401);
    const fetchMock = mockFetch({ role: 'slod' });
    try {
      assertEquals((await handle(request(payload()))).status, 401);
      assertEquals(
        fetchMock.calls.some((call) => call.path.includes('broadcast_app_notification')),
        false,
      );
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('send-app-notification broadcasts role targets and counts recipients', async () => {
  await withEnv(async (handle) => {
    const fetchMock = mockFetch({ recipients: [RECIPIENT_ID, ADMIN_ID] });
    try {
      const response = await handle(
        request(
          payload({
            targetType: 'role',
            targetRole: 'admin',
            targetRoles: ['admin', 'kiosk'],
            url: '/admin/notifications',
          }),
        ),
      );
      assertEquals(response.status, 200);
      assertEquals(await response.json(), {
        success: true,
        count: 2,
        notificationId: NOTIFICATION_ID,
      });
      const broadcast = fetchMock.calls.find(
        (call) => call.path === '/rest/v1/rpc/broadcast_app_notification',
      );
      assertEquals(broadcast?.body, {
        p_title: 'Event update',
        p_message: 'Doors open at nine.',
        p_target_type: 'role',
        p_target_role: 'admin',
        p_target_roles: ['admin', 'kiosk'],
        p_created_by: ADMIN_ID,
        p_target_url: '/admin/notifications',
      });
      const lookup = fetchMock.calls.find(
        (call) => call.path === '/rest/v1/app_notification_recipients',
      );
      assertEquals(lookup?.url.searchParams.get('notification_id'), `eq.${NOTIFICATION_ID}`);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('send-app-notification passes targeted user IDs to broadcast RPC', async () => {
  await withEnv(async (handle) => {
    const fetchMock = mockFetch({ recipients: [RECIPIENT_ID] });
    try {
      const response = await handle(
        request(payload({ targetType: 'user', targetUserId: RECIPIENT_ID })),
      );
      assertEquals(response.status, 200);
      const broadcast = fetchMock.calls.find((call) =>
        call.path.includes('broadcast_app_notification'),
      );
      assertEquals((broadcast?.body as { p_user_ids: string[] }).p_user_ids, [RECIPIENT_ID]);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'send-app-notification reports failed broadcasts without querying recipients',
  async () => {
    await withEnv(async (handle) => {
      for (const options of [{ broadcastError: true }, { notificationId: null }]) {
        const fetchMock = mockFetch(options);
        try {
          const response = await handle(request(payload()));
          assertEquals(response.status, 500);
          assertEquals(
            fetchMock.calls.some((call) => call.path === '/rest/v1/app_notification_recipients'),
            false,
          );
        } finally {
          fetchMock.restore();
        }
      }
    });
  },
);

Deno.test('send-app-notification returns success when recipient lookup fails', async () => {
  await withEnv(async (handle) => {
    const fetchMock = mockFetch({ recipientError: true });
    try {
      const response = await handle(request(payload()));
      assertEquals(await response.json(), {
        success: true,
        count: 0,
        notificationId: NOTIFICATION_ID,
      });
    } finally {
      fetchMock.restore();
    }
  });
});
