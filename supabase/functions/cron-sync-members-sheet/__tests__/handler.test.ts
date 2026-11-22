import { assertEquals } from '@std/assert';

import { handleCronSyncMembersSheet } from '../handler.ts';

const SERVICE_ROLE_KEY = 'test-service-role-key';
const CRON_ROLE_KEY = 'test-cron-role-key';
const TEST_ORIGIN = 'https://app.example.com';

async function generateTestPrivateKeyPem(): Promise<string> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );

  const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const bytes = new Uint8Array(pkcs8);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `-----BEGIN PRIVATE KEY-----\\n${base64}\\n-----END PRIVATE KEY-----`;
}

let cachedPrivateKeyPem: string | null = null;
async function getTestPrivateKeyPem(): Promise<string> {
  if (!cachedPrivateKeyPem) {
    cachedPrivateKeyPem = await generateTestPrivateKeyPem();
  }
  return cachedPrivateKeyPem;
}

const ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_ROLE_KEY',
  'ALLOWED_ORIGINS',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'GOOGLE_SHEETS_SPREADSHEET_ID',
  'GOOGLE_SHEETS_GID',
] as const;

async function withFunctionEnv(
  overrides: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>,
  run: () => Promise<void>,
) {
  const previous = new Map<string, string | undefined>(
    ENV_KEYS.map((key) => [key, Deno.env.get(key)]),
  );

  const privateKeyPem = await getTestPrivateKeyPem();
  const defaults: Partial<Record<(typeof ENV_KEYS)[number], string>> = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
    CRON_ROLE_KEY: CRON_ROLE_KEY,
    ALLOWED_ORIGINS: TEST_ORIGIN,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'sync-bot@project.iam.gserviceaccount.com',
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: privateKeyPem,
    GOOGLE_SHEETS_SPREADSHEET_ID: 'sheet-id-123',
    GOOGLE_SHEETS_GID: undefined,
  };

  for (const key of ENV_KEYS) {
    const value = key in overrides ? overrides[key] : defaults[key];
    if (value === undefined) Deno.env.delete(key);
    else Deno.env.set(key, value);
  }

  try {
    await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

let requestCounter = 0;

function buildRequest(options: { cronKey?: string; serviceRole?: boolean } = {}) {
  const headers = new Headers({
    'content-type': 'application/json',
    'x-forwarded-for': `198.51.100.${++requestCounter}`,
  });

  if (options.cronKey) {
    headers.set('x-cron-key', options.cronKey);
  } else if (options.serviceRole) {
    headers.set('authorization', `Bearer ${SERVICE_ROLE_KEY}`);
  }

  return new Request('https://example.functions/cron-sync-members-sheet', {
    method: 'POST',
    headers,
    body: '{}',
  });
}

Deno.test('cron-sync-members-sheet rejects unauthorized callers', async () => {
  await withFunctionEnv({}, async () => {
    const response = await handleCronSyncMembersSheet(buildRequest());
    assertEquals(response.status, 401);
  });
});

Deno.test(
  'cron-sync-members-sheet returns 500 when Google Sheets secrets are missing',
  async () => {
    await withFunctionEnv({ GOOGLE_SHEETS_SPREADSHEET_ID: undefined }, async () => {
      const response = await handleCronSyncMembersSheet(buildRequest({ cronKey: CRON_ROLE_KEY }));
      assertEquals(response.status, 500);
      const body = await response.json();
      assertEquals(body.error.includes('GOOGLE_SHEETS_SPREADSHEET_ID'), true);
    });
  },
);

Deno.test('cron-sync-members-sheet returns 500 when GOOGLE_SHEETS_GID is non-numeric', async () => {
  await withFunctionEnv({ GOOGLE_SHEETS_GID: 'not-a-number' }, async () => {
    const response = await handleCronSyncMembersSheet(buildRequest({ cronKey: CRON_ROLE_KEY }));
    assertEquals(response.status, 500);
    const body = await response.json();
    assertEquals(body.error.includes('GOOGLE_SHEETS_GID'), true);
  });
});

Deno.test(
  'cron-sync-members-sheet resolves tab by gid, syncs valid rows, skips invalid rows, and passes clear_metadata_keys',
  async () => {
    await withFunctionEnv({ GOOGLE_SHEETS_GID: '987654' }, async () => {
      const originalFetch = globalThis.fetch;
      let capturedRpcPayload: unknown = null;
      let capturedValuesPath = '';

      globalThis.fetch = async (input, init) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());

        if (url.hostname === 'oauth2.googleapis.com' && url.pathname === '/token') {
          return Response.json({ access_token: 'mock-google-token', expires_in: 3600 });
        }

        if (url.hostname === 'sheets.googleapis.com' && !url.pathname.includes('/values/')) {
          return Response.json({
            sheets: [
              { properties: { sheetId: 0, title: 'Summary' } },
              { properties: { sheetId: 987654, title: "Members' Roster" } },
            ],
          });
        }

        if (url.hostname === 'sheets.googleapis.com' && url.pathname.includes('/values/')) {
          capturedValuesPath = decodeURIComponent(url.pathname);
          return Response.json({
            values: [
              [
                'Timestamp',
                'RFID',
                'VolunteerID',
                'Role',
                'Category',
                'Surname',
                'Firstname',
                'Nickname',
                'SR_PWD',
                '1st Sunday',
                '2nd Sunday',
                '3rd Sunday',
                '4th Sunday',
                '5th Sunday',
                'IsOIC',
                'Blockage Count',
                'Manual Entry Count',
                'Pref_Tables',
                '__PowerAppsId__',
              ],
              [
                '2026-11-22',
                'RFID-001',
                'VOL-1',
                'Prayer Coach',
                'Adults',
                'Dela Cruz',
                'Juan',
                'Johnny',
                '0',
                '9AM',
                '',
                '',
                '',
                '',
                '1',
                '',
                '',
                'T1',
                'pa-1',
              ],
              // Invalid row (missing RFID) -> skipped
              [
                '2026-11-22',
                '',
                'VOL-2',
                'Usher',
                'Adults',
                'Missing',
                'NoId',
                'Noid',
                '0',
                '9AM',
                '',
                '',
                '',
                '',
                '0',
                '',
                '',
                '',
                'pa-2',
              ],
            ],
          });
        }

        if (url.pathname === '/rest/v1/users') {
          return Response.json([
            {
              id: 'user-1',
              member_id: 'RFID-001',
              first_name: 'Juan',
              last_name: 'Dela Cruz',
              nickname: 'Johnny',
              email: 'juan@example.com',
            },
          ]);
        }

        if (url.pathname === '/rest/v1/rpc/apply_bulk_member_upsert') {
          const rawBody =
            typeof init?.body === 'string'
              ? init.body
              : input instanceof Request
                ? await input.text()
                : '{}';
          capturedRpcPayload = JSON.parse(rawBody);
          return Response.json([{ inserted_count: 0, updated_count: 1 }]);
        }

        return new Response(`Unexpected request: ${url.toString()}`, { status: 500 });
      };

      try {
        const response = await handleCronSyncMembersSheet(buildRequest({ cronKey: CRON_ROLE_KEY }));
        const body = await response.json();

        assertEquals(response.status, 200);
        assertEquals(body.success, true);
        assertEquals(body.inserted_count, 0);
        assertEquals(body.updated_count, 1);
        assertEquals(body.skipped_count, 1);
        assertEquals(body.total_sheet_rows, 2);
        assertEquals(body.errors.length, 1);
        assertEquals(capturedValuesPath.endsWith("/values/'Members'' Roster'"), true);

        const rpcRows = (capturedRpcPayload as { p_rows: Array<Record<string, unknown>> }).p_rows;
        assertEquals(rpcRows.length, 1);
        assertEquals(rpcRows[0].operation, 'update');
        assertEquals(rpcRows[0].target_id, 'user-1');
        assertEquals((rpcRows[0].clear_metadata_keys as string[]).includes('second_sunday'), true);
        assertEquals((rpcRows[0].metadata as Record<string, unknown>).timestamp, undefined);
        assertEquals((rpcRows[0].metadata as Record<string, unknown>).powerappsid, undefined);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  },
);

Deno.test(
  'cron-sync-members-sheet defaults to first tab and handles an empty sheet without calling RPC',
  async () => {
    await withFunctionEnv({}, async () => {
      const originalFetch = globalThis.fetch;
      let rpcCalled = false;
      let capturedValuesPath = '';

      globalThis.fetch = (input) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.hostname === 'oauth2.googleapis.com') {
          return Promise.resolve(Response.json({ access_token: 'mock-token' }));
        }
        if (url.hostname === 'sheets.googleapis.com' && !url.pathname.includes('/values/')) {
          return Promise.resolve(
            Response.json({
              sheets: [{ properties: { sheetId: 0, title: 'Members' } }],
            }),
          );
        }
        if (url.hostname === 'sheets.googleapis.com' && url.pathname.includes('/values/')) {
          capturedValuesPath = decodeURIComponent(url.pathname);
          return Promise.resolve(Response.json({ values: [['RFID', 'Firstname']] }));
        }
        if (url.pathname.includes('apply_bulk_member_upsert')) {
          rpcCalled = true;
        }
        return Promise.resolve(new Response('Unexpected', { status: 500 }));
      };

      try {
        const response = await handleCronSyncMembersSheet(buildRequest({ cronKey: CRON_ROLE_KEY }));
        const body = await response.json();
        assertEquals(response.status, 200);
        assertEquals(body.total_sheet_rows, 0);
        assertEquals(rpcCalled, false);
        assertEquals(capturedValuesPath.endsWith("/values/'Members'"), true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  },
);

Deno.test('cron-sync-members-sheet returns 500 when Google Sheets API fails', async () => {
  await withFunctionEnv({}, async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.hostname === 'oauth2.googleapis.com') {
        return Promise.resolve(Response.json({ access_token: 'mock-token' }));
      }
      if (url.hostname === 'sheets.googleapis.com' && !url.pathname.includes('/values/')) {
        return Promise.resolve(
          Response.json({
            sheets: [{ properties: { sheetId: 0, title: 'Members' } }],
          }),
        );
      }
      if (url.hostname === 'sheets.googleapis.com') {
        return Promise.resolve(new Response('Forbidden', { status: 403 }));
      }
      return Promise.resolve(new Response('Unexpected', { status: 500 }));
    };

    try {
      const response = await handleCronSyncMembersSheet(buildRequest({ cronKey: CRON_ROLE_KEY }));
      assertEquals(response.status, 500);
      const body = await response.json();
      assertEquals(body.error, 'Failed to sync members from Google Sheet');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
