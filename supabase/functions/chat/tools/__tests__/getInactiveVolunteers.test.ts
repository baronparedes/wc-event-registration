import { assertEquals } from '@std/assert';

import { createGetInactiveVolunteersTool } from '../getInactiveVolunteers.ts';
import { MOCK_TOOL_OPTIONS, createMockClient, jsonResponse, withMockFetch } from './testHelpers.ts';

Deno.test('getInactiveVolunteers handles early return when userTokens not found', async () => {
  const client = createMockClient();
  const tool = createGetInactiveVolunteersTool({ client, requestId: 'req-inactive-1' });

  await withMockFetch(
    (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/user_tokens')) {
        return jsonResponse([]);
      }
      return jsonResponse([], 404);
    },
    async () => {
      const result = await tool.execute(
        {
          limit: 50,
          userTokens: ['NON_EXISTENT_TOKEN'],
          targetStartDate: '2026-10-01',
          targetEndDate: '2026-10-31',
        },
        MOCK_TOOL_OPTIONS,
      );

      if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
        throw new Error('Expected object result');
      }

      if ('error' in result) {
        throw new Error(`Unexpected error: ${result.error}`);
      }

      assertEquals(result.total_inactive_volunteers, 0);
      assertEquals(result.note, 'No volunteers found matching tokens: NON_EXISTENT_TOKEN.');
    },
  );
});

Deno.test('getInactiveVolunteers handles RPC error', async () => {
  const client = createMockClient();
  const tool = createGetInactiveVolunteersTool({ client, requestId: 'req-inactive-2' });

  await withMockFetch(
    () => jsonResponse({ message: 'RPC execution failed' }, 500),
    async () => {
      const result = await tool.execute(
        {
          limit: 50,
          targetStartDate: '2026-10-01',
          targetEndDate: '2026-10-31',
        },
        MOCK_TOOL_OPTIONS,
      );

      assertEquals(result, {
        error: 'Failed to retrieve commitment stats: RPC execution failed',
      });
    },
  );
});

Deno.test('getInactiveVolunteers correctly filters and sorts inactive volunteers', async () => {
  const client = createMockClient();
  const tool = createGetInactiveVolunteersTool({ client, requestId: 'req-inactive-3' });

  const mockRpcData = [
    {
      user_id: 'user-1',
      member_id: 'MEM-01',
      avatar_object_key: null,
      full_name: 'Inactive Usher 1',
      nickname: 'Bob',
      email: 'bob@example.com',
      role: 'Usher',
      category: 'regular',
      start_date: '2026-10-01',
      committed: 4,
      attended: 0,
      absences: 4,
      excused: 0,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      wi_5th_sunday: 0,
      attendance_score: -5,
      total_count: 3,
    },
    {
      user_id: 'user-2',
      member_id: 'MEM-02',
      avatar_object_key: null,
      full_name: 'Active Greeter',
      nickname: 'Alice',
      email: 'alice@example.com',
      role: 'Greeter',
      category: 'regular',
      start_date: '2026-10-01',
      committed: 4,
      attended: 3,
      absences: 1,
      excused: 0,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      wi_5th_sunday: 0,
      attendance_score: 8,
      total_count: 3,
    },
    {
      user_id: 'user-3',
      member_id: 'MEM-03',
      avatar_object_key: null,
      full_name: 'Inactive Usher 2',
      nickname: 'Charlie',
      email: 'charlie@example.com',
      role: 'Usher',
      category: 'regular',
      start_date: '2026-10-01',
      committed: 2,
      attended: 0,
      absences: 2,
      excused: 0,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      wi_5th_sunday: 0,
      attendance_score: -2,
      total_count: 3,
    },
  ];

  await withMockFetch(
    (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/rpc/get_commitment_dashboard_stats')) {
        return jsonResponse(mockRpcData);
      }
      if (url.pathname.includes('/user_tokens')) {
        return jsonResponse([
          { user_id: 'user-1', token: 'USR_001' },
          { user_id: 'user-3', token: 'USR_003' },
        ]);
      }
      return jsonResponse([], 404);
    },
    async () => {
      const result = await tool.execute(
        {
          limit: 50,
          role: 'usher',
          targetStartDate: '2026-10-01',
          targetEndDate: '2026-10-31',
        },
        MOCK_TOOL_OPTIONS,
      );

      if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
        throw new Error('Expected object result');
      }

      if ('error' in result) {
        throw new Error(`Unexpected error: ${result.error}`);
      }

      assertEquals(result.total_inactive_volunteers, 2);
      assertEquals(result.returned_count, 2);
      // Most missed commitments first (committed = 4 comes before committed = 2)
      assertEquals(result.inactive_volunteers[0].token, 'USR_001');
      assertEquals(result.inactive_volunteers[0].committed, 4);
      assertEquals(result.inactive_volunteers[1].token, 'USR_003');
      assertEquals(result.inactive_volunteers[1].committed, 2);
    },
  );
});
