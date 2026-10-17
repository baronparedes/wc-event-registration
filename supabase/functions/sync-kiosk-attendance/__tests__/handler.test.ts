import { assertEquals } from '@std/assert';

import {
  UNASSIGNED_TABLE,
  USHER_BACKROOM_TABLE,
  handleSyncKioskAttendance,
  mapServiceAttendanceTableNumber,
} from '../handler.ts';

const SYNC_KEY = 'test-attendance-sync-key';
const LAYOUT_ID = '11111111-1111-4111-8111-111111111111';
const USER_1_ID = '22222222-2222-4222-8222-222222222222';
const USER_2_ID = '33333333-3333-4333-8333-333333333333';
const SEAT_1_ID = '44444444-4444-4444-8444-444444444444';
const SEAT_USHER_ID = '55555555-5555-4555-8555-555555555555';

async function withFunctionEnv(run: () => Promise<void>) {
  const previousValues = new Map<string, string | undefined>(
    ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ATTENDANCE_SYNC_KEY', 'ALLOWED_ORIGINS'].map(
      (name) => [name, Deno.env.get(name)],
    ),
  );

  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ATTENDANCE_SYNC_KEY', SYNC_KEY);
  Deno.env.set('ALLOWED_ORIGINS', 'https://app.example.com');

  try {
    await run();
  } finally {
    for (const [name, value] of previousValues) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function buildRequest(body: unknown, syncKey: string | null = SYNC_KEY) {
  const headers = new Headers({
    'content-type': 'application/json',
  });
  if (syncKey) {
    headers.set('x-sync-key', syncKey);
  }

  return new Request('https://example.functions/sync-kiosk-attendance', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function jsonResponse(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

Deno.test('mapServiceAttendanceTableNumber maps table numbers accurately', () => {
  assertEquals(mapServiceAttendanceTableNumber(''), UNASSIGNED_TABLE);
  assertEquals(mapServiceAttendanceTableNumber('x'), UNASSIGNED_TABLE);
  assertEquals(mapServiceAttendanceTableNumber('X'), UNASSIGNED_TABLE);
  assertEquals(mapServiceAttendanceTableNumber('667'), USHER_BACKROOM_TABLE);
  assertEquals(mapServiceAttendanceTableNumber('Table 105'), USHER_BACKROOM_TABLE);
  assertEquals(mapServiceAttendanceTableNumber('20'), '20');
  assertEquals(mapServiceAttendanceTableNumber('Table 5'), 'Table 5');
});

Deno.test(
  'sync-kiosk-attendance rejects unauthorized requests without valid sync key',
  async () => {
    await withFunctionEnv(async () => {
      const validBody = {
        date: '2026-10-18',
        records: [{ date: '2026-10-18', time_slot: '3PM' }],
      };

      // Missing key
      const res1 = await handleSyncKioskAttendance(buildRequest(validBody, null));
      assertEquals(res1.status, 401);

      // Invalid key
      const res2 = await handleSyncKioskAttendance(buildRequest(validBody, 'wrong-key'));
      assertEquals(res2.status, 401);
    });
  },
);

Deno.test('sync-kiosk-attendance validates payload structure', async () => {
  await withFunctionEnv(async () => {
    // Missing records
    const res1 = await handleSyncKioskAttendance(buildRequest({ date: '2026-10-18' }));
    assertEquals(res1.status, 400);

    // Invalid date format
    const res2 = await handleSyncKioskAttendance(
      buildRequest({
        date: '10/18/2026',
        records: [{ date: '2026-10-18', time_slot: '3PM' }],
      }),
    );
    assertEquals(res2.status, 400);

    // Empty records array
    const res3 = await handleSyncKioskAttendance(
      buildRequest({
        date: '2026-10-18',
        records: [],
      }),
    );
    assertEquals(res3.status, 400);
  });
});

Deno.test('sync-kiosk-attendance resolves members, seats, and applies bulk upsert', async () => {
  await withFunctionEnv(async () => {
    const originalFetch = globalThis.fetch;
    const rpcCalls: Array<{ path: string; body: Record<string, unknown> }> = [];

    globalThis.fetch = (input, init) => {
      const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
      const pathname = requestUrl.pathname;

      // 1. service_layouts lookup
      if (pathname === '/rest/v1/service_layouts') {
        return jsonResponse([{ id: LAYOUT_ID }]);
      }

      // 2. service_seats lookup
      if (pathname === '/rest/v1/service_seats') {
        return jsonResponse([
          { id: SEAT_1_ID, table_number: '20' },
          { id: SEAT_USHER_ID, table_number: USHER_BACKROOM_TABLE },
        ]);
      }

      // 3. users lookup (RFID or name)
      if (pathname === '/rest/v1/users') {
        const queryParams = requestUrl.searchParams;
        if (queryParams.has('member_id')) {
          return jsonResponse([
            {
              id: USER_1_ID,
              member_id: '123456',
              full_name: 'John Doe',
              nickname: 'Johnny',
              first_name: 'John',
              last_name: 'Doe',
            },
          ]);
        }
        if (queryParams.has('or')) {
          return jsonResponse([
            {
              id: USER_2_ID,
              member_id: '999888',
              full_name: 'Jane Smith',
              nickname: 'Jane',
              first_name: 'Jane',
              last_name: 'Smith',
            },
          ]);
        }
        return jsonResponse([]);
      }

      // 4. RPC apply_bulk_service_attendance_upsert
      if (pathname === '/rest/v1/rpc/apply_bulk_service_attendance_upsert') {
        const parsedBody = JSON.parse(String(init?.body ?? '{}'));
        rpcCalls.push({ path: pathname, body: parsedBody });
        return jsonResponse([{ inserted_count: 2, updated_count: 0, total_count: 2 }]);
      }

      return jsonResponse({ error: 'Not found' }, 404);
    };

    try {
      const payload = {
        date: '2026-10-18',
        records: [
          // Row 1: Matches by RFID
          {
            rfid: '123456',
            name: 'John Doe',
            role: 'Prayer Coach',
            date: '2026-10-18',
            time: '16:00:00',
            time_slot: '3PM',
            table: '20',
            override: 0,
            manual_entry: 0,
            is_walk_in: false,
            volunteer_id: '101',
          },
          // Row 2: No RFID, matches by Name fallback
          {
            rfid: '',
            name: 'Jane Smith',
            role: 'Usher',
            date: '2026-10-18',
            time: '16:05:00',
            time_slot: '3PM',
            table: '667', // Should map to USHER_BACKROOM_TABLE
            override: 1,
            manual_entry: 1,
            is_walk_in: true,
            volunteer_id: '102',
          },
          // Row 3: Unknown member -> should be recorded in unmatched
          {
            rfid: 'unknown-rfid',
            name: 'Unknown Person',
            role: 'Attendee',
            date: '2026-10-18',
            time: '16:10:00',
            time_slot: '3PM',
            table: '5',
          },
        ],
      };

      const response = await handleSyncKioskAttendance(buildRequest(payload));
      assertEquals(response.status, 200);

      const json = await response.json();
      assertEquals(json.success, true);
      assertEquals(json.total_received, 3);
      assertEquals(json.valid_count, 2);
      assertEquals(json.inserted_count, 2);
      assertEquals(json.unmatched.length, 1);
      assertEquals(json.unmatched[0].name, 'Unknown Person');

      // Verify RPC was invoked with mapped seat and user IDs
      assertEquals(rpcCalls.length, 1);
      assertEquals(rpcCalls[0].body.p_layout_id, LAYOUT_ID);
      const rows = rpcCalls[0].body.p_rows as Array<{
        user_id: string;
        service_seat_id: string;
        is_walk_in: boolean;
      }>;
      assertEquals(rows.length, 2);
      assertEquals(rows[0].user_id, USER_1_ID);
      assertEquals(rows[0].service_seat_id, SEAT_1_ID);
      assertEquals(rows[1].user_id, USER_2_ID);
      assertEquals(rows[1].service_seat_id, SEAT_USHER_ID);
      assertEquals(rows[1].is_walk_in, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
