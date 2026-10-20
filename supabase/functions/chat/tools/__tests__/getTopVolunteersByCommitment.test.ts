import { assertEquals } from '@std/assert';

import { createGetTopVolunteersByCommitmentTool } from '../getTopVolunteersByCommitment.ts';
import { MOCK_TOOL_OPTIONS, createMockClient, jsonResponse, withMockFetch } from './testHelpers.ts';

Deno.test('getTopVolunteersByCommitment handles RPC error', async () => {
  const client = createMockClient();
  const tool = createGetTopVolunteersByCommitmentTool({ client, requestId: 'req-top-1' });

  await withMockFetch(
    () => jsonResponse({ message: 'Leaderboard RPC failed' }, 500),
    async () => {
      const result = await tool.execute(
        {
          limit: 10,
          sortBy: 'attendance_score',
          targetStartDate: '2026-10-01',
          targetEndDate: '2026-10-31',
        },
        MOCK_TOOL_OPTIONS,
      );

      assertEquals(result, {
        error: 'Failed to retrieve commitment stats: Leaderboard RPC failed',
      });
    },
  );
});

Deno.test(
  'getTopVolunteersByCommitment sorts by attendance_score by default and attaches tokens',
  async () => {
    const client = createMockClient();
    const tool = createGetTopVolunteersByCommitmentTool({ client, requestId: 'req-top-2' });

    const mockRpcData = [
      {
        user_id: 'user-low',
        member_id: 'MEM-01',
        avatar_object_key: null,
        full_name: 'Usher Low Score',
        nickname: 'Low',
        email: 'low@example.com',
        role: 'Usher',
        category: 'regular',
        start_date: '2026-10-01',
        committed: 4,
        attended: 2,
        absences: 2,
        excused: 0,
        wi_9am_3pm: 0,
        wi_12nn: 0,
        wi_5th_sunday: 0,
        attendance_score: 3,
        total_count: 2,
      },
      {
        user_id: 'user-high',
        member_id: 'MEM-02',
        avatar_object_key: null,
        full_name: 'Usher High Score',
        nickname: 'High',
        email: 'high@example.com',
        role: 'Usher',
        category: 'regular',
        start_date: '2026-10-01',
        committed: 4,
        attended: 4,
        absences: 0,
        excused: 0,
        wi_9am_3pm: 0,
        wi_12nn: 0,
        wi_5th_sunday: 0,
        attendance_score: 10,
        total_count: 2,
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
            { user_id: 'user-high', token: 'USR_HIGH' },
            { user_id: 'user-low', token: 'USR_LOW' },
          ]);
        }
        return jsonResponse([], 404);
      },
      async () => {
        const result = await tool.execute(
          {
            limit: 10,
            sortBy: 'attendance_score',
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

        assertEquals(result.returned_count, 2);
        assertEquals(result.top_volunteers[0].token, 'USR_HIGH');
        assertEquals(result.top_volunteers[0].attendance_score, 10);
        assertEquals(result.top_volunteers[1].token, 'USR_LOW');
        assertEquals(result.top_volunteers[1].attendance_score, 3);
      },
    );
  },
);

Deno.test('getTopVolunteersByCommitment sorts by attended count when requested', async () => {
  const client = createMockClient();
  const tool = createGetTopVolunteersByCommitmentTool({ client, requestId: 'req-top-3' });

  const mockRpcData = [
    {
      user_id: 'user-score-high-attended-low',
      member_id: 'MEM-01',
      avatar_object_key: null,
      full_name: 'Score High',
      nickname: 'SH',
      email: 'sh@example.com',
      role: 'Greeter',
      category: 'regular',
      start_date: '2026-10-01',
      committed: 1,
      attended: 1,
      absences: 0,
      excused: 0,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      wi_5th_sunday: 0,
      attendance_score: 10,
      total_count: 2,
    },
    {
      user_id: 'user-attended-high',
      member_id: 'MEM-02',
      avatar_object_key: null,
      full_name: 'Attended High',
      nickname: 'AH',
      email: 'ah@example.com',
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
      attendance_score: 5,
      total_count: 2,
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
          { user_id: 'user-attended-high', token: 'USR_ATT_HIGH' },
          { user_id: 'user-score-high-attended-low', token: 'USR_SCORE_HIGH' },
        ]);
      }
      return jsonResponse([], 404);
    },
    async () => {
      const result = await tool.execute(
        {
          limit: 10,
          sortBy: 'attended',
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

      assertEquals(result.sort_by, 'attended');
      // user-attended-high has attended = 3 vs 1
      assertEquals(result.top_volunteers[0].token, 'USR_ATT_HIGH');
      assertEquals(result.top_volunteers[0].attended, 3);
    },
  );
});
