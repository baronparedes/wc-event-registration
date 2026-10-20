import { assertEquals } from '@std/assert';

import { createGetServiceDashboardStatsTool } from '../getServiceDashboardStats.ts';
import { MOCK_TOOL_OPTIONS, createMockClient, jsonResponse, withMockFetch } from './testHelpers.ts';

Deno.test('getServiceDashboardStats handles RPC error', async () => {
  const client = createMockClient();
  const tool = createGetServiceDashboardStatsTool({ client, requestId: 'req-service-dash-1' });

  await withMockFetch(
    () => jsonResponse({ message: 'Dashboard stats RPC error' }, 500),
    async () => {
      const result = await tool.execute(
        {
          targetStartDate: '2026-10-18',
          targetEndDate: '2026-10-18',
        },
        MOCK_TOOL_OPTIONS,
      );

      assertEquals(result, {
        error: 'Failed to retrieve service dashboard statistics: Dashboard stats RPC error',
      });
    },
  );
});

Deno.test('getServiceDashboardStats parses single Sunday stats and turnup rates', async () => {
  const client = createMockClient();
  const tool = createGetServiceDashboardStatsTool({ client, requestId: 'req-service-dash-2' });

  let capturedBody: Record<string, unknown> | null = null;

  const mockRpcResponse = {
    time_slots: {
      '9AM': {
        committed: 10,
        present: 9,
        walk_ins: 2,
        late_tardy: 1,
        roles: { Usher: 5, Greeter: 4 },
      },
      '12NN': {
        committed: 8,
        present: 8,
        walk_ins: 0,
        late_tardy: 0,
        roles: { Usher: 4, Greeter: 4 },
      },
      '3PM': {
        committed: 5,
        present: 3,
        walk_ins: 1,
        late_tardy: 0,
        roles: { Usher: 2, Greeter: 1 },
      },
    },
    roles: ['Usher', 'Greeter'],
  };

  await withMockFetch(
    (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/rpc/get_service_dashboard_stats')) {
        if (init?.body) capturedBody = JSON.parse(String(init.body));
        return jsonResponse(mockRpcResponse);
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

      if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
        throw new Error('Expected object result');
      }

      if ('error' in result) {
        throw new Error(`Unexpected error: ${result.error}`);
      }

      assertEquals(capturedBody?.p_sunday_date, '2026-10-18');
      assertEquals(result.overall.total_committed, 23);
      assertEquals(result.overall.total_present, 20);
      // 20 / 23 * 100 = 87%
      assertEquals(result.overall.overall_turnup_percent, 87);
      assertEquals(result.overall.total_walk_ins, 3);
      assertEquals(result.overall.total_late_tardy, 1);
      assertEquals(result.time_slots['9AM'].turnup_rate_percent, 90);
      assertEquals(result.time_slots['12NN'].turnup_rate_percent, 100);
      assertEquals(result.time_slots['3PM'].turnup_rate_percent, 60);
    },
  );
});

Deno.test('getServiceDashboardStats handles month range parameters', async () => {
  const client = createMockClient();
  const tool = createGetServiceDashboardStatsTool({ client, requestId: 'req-service-dash-3' });

  let capturedBody: Record<string, unknown> | null = null;

  await withMockFetch(
    (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/rpc/get_service_dashboard_stats')) {
        if (init?.body) capturedBody = JSON.parse(String(init.body));
        return jsonResponse({});
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

      assertEquals(capturedBody?.p_year, 2026);
      assertEquals(capturedBody?.p_month, 10);
      assertEquals(result.overall.total_committed, 0);
    },
  );
});
