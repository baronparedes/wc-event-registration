import { assertEquals } from '@std/assert';

import { createGetCommitmentSummaryStatsTool } from '../getCommitmentSummaryStats.ts';
import { MOCK_TOOL_OPTIONS, createMockClient, jsonResponse, withMockFetch } from './testHelpers.ts';

Deno.test('getCommitmentSummaryStats handles RPC error', async () => {
  const client = createMockClient();
  const tool = createGetCommitmentSummaryStatsTool({ client, requestId: 'req-stats-1' });

  await withMockFetch(
    () => jsonResponse({ message: 'Database error' }, 500),
    async () => {
      const result = await tool.execute(
        {
          targetStartDate: '2026-10-01',
          targetEndDate: '2026-10-31',
        },
        MOCK_TOOL_OPTIONS,
      );

      assertEquals(result, {
        error: 'Failed to retrieve commitment summary statistics: Database error',
      });
    },
  );
});

Deno.test('getCommitmentSummaryStats computes metrics, rates, and role breakdowns', async () => {
  const client = createMockClient();
  const tool = createGetCommitmentSummaryStatsTool({ client, requestId: 'req-stats-2' });

  const mockRpcData = [
    {
      user_id: 'user-1',
      member_id: 'MEM-01',
      avatar_object_key: null,
      full_name: 'John Usher',
      nickname: 'John',
      email: 'john@example.com',
      role: 'Usher',
      category: 'regular',
      start_date: '2026-10-01',
      committed: 4,
      attended: 3,
      absences: 1,
      excused: 0,
      wi_9am_3pm: 1,
      wi_12nn: 0,
      wi_5th_sunday: 0,
      attendance_score: 6,
      total_count: 2,
    },
    {
      user_id: 'user-2',
      member_id: 'MEM-02',
      avatar_object_key: null,
      full_name: 'Mary Greeter',
      nickname: 'Mary',
      email: 'mary@example.com',
      role: 'Greeter',
      category: 'regular',
      start_date: '2026-10-01',
      committed: 2,
      attended: 2,
      absences: 0,
      excused: 0,
      wi_9am_3pm: 0,
      wi_12nn: 1,
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
      return jsonResponse([], 404);
    },
    async () => {
      const result = await tool.execute(
        {
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

      assertEquals(result.summary.total_active_volunteers, 2);
      assertEquals(result.summary.total_committed_slots, 6);
      assertEquals(result.summary.total_attended_slots, 5);
      // 5 / 6 * 100 = 83%
      assertEquals(result.summary.overall_attendance_rate_percent, 83);
      assertEquals(result.summary.total_unexcused_absences, 1);
      assertEquals(result.summary.total_excused_absences, 0);
      assertEquals(result.summary.total_walk_ins, 2);
      assertEquals(result.summary.average_attendance_score, 8);

      // Roles breakdown
      assertEquals(result.roles_breakdown['Usher'].total_volunteers, 1);
      assertEquals(result.roles_breakdown['Usher'].attendance_rate_percent, 75);
      assertEquals(result.roles_breakdown['Greeter'].total_volunteers, 1);
      assertEquals(result.roles_breakdown['Greeter'].attendance_rate_percent, 100);
    },
  );
});
