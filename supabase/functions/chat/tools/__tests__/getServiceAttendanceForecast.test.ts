import { assertEquals } from '@std/assert';

import { createGetServiceAttendanceForecastTool } from '../getServiceAttendanceForecast.ts';
import { MOCK_TOOL_OPTIONS, createMockClient, jsonResponse, withMockFetch } from './testHelpers.ts';

Deno.test('getServiceAttendanceForecast handles users query error', async () => {
  const client = createMockClient();
  const tool = createGetServiceAttendanceForecastTool({ client, requestId: 'req-forecast-1' });

  await withMockFetch(
    (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/users')) {
        return jsonResponse({ message: 'DB error reading users' }, 500);
      }
      return jsonResponse([], 404);
    },
    async () => {
      const result = await tool.execute(
        {
          targetStartDate: '2026-10-18',
          targetEndDate: '2026-10-18',
        },
        MOCK_TOOL_OPTIONS,
      );

      assertEquals(result, {
        error: 'Failed to retrieve users: DB error reading users',
      });
    },
  );
});

Deno.test(
  'getServiceAttendanceForecast calculates turnup forecast, deficits, and surplus',
  async () => {
    const previousUrl = Deno.env.get('SUPABASE_URL');
    const previousKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
    Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');

    try {
      const client = createMockClient();
      const tool = createGetServiceAttendanceForecastTool({ client, requestId: 'req-forecast-2' });

      const mockUsers = [
        {
          id: 'user-usher-1',
          member_id: 'MEM-01',
          role: 'Usher',
          metadata: {
            first_sunday: '9AM, 12NN',
            third_sunday: '9AM, 12NN',
          },
        },
        {
          id: 'user-usher-2',
          member_id: 'MEM-02',
          role: 'Usher',
          metadata: {
            first_sunday: '9AM',
            third_sunday: '9AM',
          },
        },
      ];

      const mockHistoricalStats = [
        {
          user_id: 'user-usher-1',
          total_count: 4,
          total_checkins: 4,
          total_overrides: 0,
          total_manual_entries: 0,
          total_walkins: 0,
        },
      ];

      await withMockFetch(
        (input) => {
          const url = new URL(input instanceof Request ? input.url : input.toString());
          if (url.pathname.includes('/rest/v1/users')) {
            return jsonResponse(mockUsers);
          }
          if (url.pathname.includes('/rpc/get_member_service_attendance_stats')) {
            return jsonResponse(mockHistoricalStats);
          }
          if (url.pathname.includes('/functions/v1/get-excused-members')) {
            return jsonResponse({ records: [] });
          }
          return jsonResponse([], 404);
        },
        async () => {
          const result = await tool.execute(
            {
              targetStartDate: '2026-10-18',
              targetEndDate: '2026-10-18',
              targetsOverride: {
                '9AM': { Usher: 2 },
                '12NN': { Usher: 2 },
                '3PM': { Usher: 2 },
              },
            },
            MOCK_TOOL_OPTIONS,
          );

          if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
            throw new Error('Expected object result');
          }

          if ('error' in result) {
            throw new Error(`Unexpected error: ${result.error}`);
          }

          const oct18Forecast = result.forecasts_by_date['2026-10-18'];
          assertEquals(Boolean(oct18Forecast), true);

          // 9AM slot: user 1 (100% turnup = 1) + user 2 (default 80% turnup = 0.8) -> rounded to 1 + 1 = 2 turnup
          const slot9AM = oct18Forecast['9AM'];
          assertEquals(slot9AM.totalTarget, 2);
          assertEquals(slot9AM.totalCommitted, 2);
          assertEquals(slot9AM.roles['Usher'].committed, 2);
          assertEquals(slot9AM.totalNeeded, 0); // Target met

          // 12NN slot: only user 1 committed (turnup = 1), target is 2 -> needed = 1
          const slot12NN = oct18Forecast['12NN'];
          assertEquals(slot12NN.totalTarget, 2);
          assertEquals(slot12NN.totalCommitted, 1);
          assertEquals(slot12NN.totalNeeded, 1);
        },
      );
    } finally {
      if (previousUrl !== undefined) Deno.env.set('SUPABASE_URL', previousUrl);
      else Deno.env.delete('SUPABASE_URL');
      if (previousKey !== undefined) Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', previousKey);
      else Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
    }
  },
);
