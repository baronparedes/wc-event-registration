import { assertEquals } from '@std/assert';

import { createGetUserServiceActivityTool } from '../getUserServiceActivity.ts';
import { MOCK_TOOL_OPTIONS, createMockClient, jsonResponse, withMockFetch } from './testHelpers.ts';

Deno.test('getUserServiceActivity returns early when userTokens not found', async () => {
  const client = createMockClient();
  const tool = createGetUserServiceActivityTool({ client, requestId: 'req-act-1' });

  await withMockFetch(
    (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/user_tokens')) {
        return jsonResponse([]);
      }
      return jsonResponse([], 404);
    },
    async () => {
      const activeResult = await tool.execute(
        {
          activityType: 'active',
          userTokens: ['NON_EXISTENT_TOKEN'],
          targetStartDate: '2026-10-01',
          targetEndDate: '2026-10-31',
          limit: 50,
        },
        MOCK_TOOL_OPTIONS,
      );

      if (
        !activeResult ||
        typeof activeResult !== 'object' ||
        Symbol.asyncIterator in activeResult
      ) {
        throw new Error('Expected object result');
      }

      assertEquals(activeResult.volunteers, []);
      assertEquals(activeResult.summary?.total_active_volunteers, 0);

      const inactiveResult = await tool.execute(
        {
          activityType: 'inactive',
          userTokens: ['NON_EXISTENT_TOKEN'],
          targetStartDate: '2026-10-01',
          targetEndDate: '2026-10-31',
          limit: 50,
        },
        MOCK_TOOL_OPTIONS,
      );

      if (
        !inactiveResult ||
        typeof inactiveResult !== 'object' ||
        Symbol.asyncIterator in inactiveResult
      ) {
        throw new Error('Expected object result');
      }

      assertEquals(inactiveResult.inactive_volunteers, []);
      assertEquals(inactiveResult.total_inactive_count, 0);
    },
  );
});

Deno.test('getUserServiceActivity queries active checkins, walk-ins, and lates', async () => {
  const client = createMockClient();
  const tool = createGetUserServiceActivityTool({ client, requestId: 'req-act-2' });

  const mockAttendanceData = [
    {
      service_date: '2026-10-18',
      checked_in_at: '2026-10-18T08:50:00Z',
      time_slot: '9AM',
      is_override: false,
      is_walk_in: false,
      users: {
        role: 'Usher',
        user_tokens: [{ token: 'USR_ACTIVE_1' }],
      },
    },
    {
      service_date: '2026-10-18',
      checked_in_at: '2026-10-18T12:15:00Z',
      time_slot: '12NN',
      is_override: true, // late
      is_walk_in: true, // walk-in
      users: {
        role: 'Usher',
        user_tokens: [{ token: 'USR_ACTIVE_1' }],
      },
    },
  ];

  await withMockFetch(
    (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/service_attendance')) {
        return jsonResponse(mockAttendanceData);
      }
      return jsonResponse([], 404);
    },
    async () => {
      const result = await tool.execute(
        {
          activityType: 'active',
          role: 'usher',
          targetStartDate: '2026-10-01',
          targetEndDate: '2026-10-31',
          limit: 50,
        },
        MOCK_TOOL_OPTIONS,
      );

      if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
        throw new Error('Expected object result');
      }

      if ('error' in result) {
        throw new Error(`Unexpected error: ${result.error}`);
      }

      assertEquals(result.volunteers?.length, 1);
      assertEquals(result.volunteers?.[0].token, 'USR_ACTIVE_1');
      assertEquals(result.volunteers?.[0].total_checkins, 2);
      assertEquals(result.volunteers?.[0].walk_ins, 1);
      assertEquals(result.volunteers?.[0].lates, 1);
      assertEquals(result.summary?.total_checkins, 2);
      assertEquals(result.summary?.total_walk_ins, 1);
      assertEquals(result.summary?.total_lates, 1);
    },
  );
});

Deno.test('getUserServiceActivity queries inactive volunteers who did not check in', async () => {
  const client = createMockClient();
  const tool = createGetUserServiceActivityTool({ client, requestId: 'req-act-3' });

  const mockUsers = [
    {
      id: 'user-checked',
      role: 'Greeter',
      user_tokens: [{ token: 'USR_CHECKED' }],
    },
    {
      id: 'user-inactive',
      role: 'Greeter',
      user_tokens: [{ token: 'USR_INACTIVE' }],
    },
  ];

  const mockAttendanceData = [{ user_id: 'user-checked' }];

  await withMockFetch(
    (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/rest/v1/users')) {
        return jsonResponse(mockUsers);
      }
      if (url.pathname.includes('/rest/v1/service_attendance')) {
        return jsonResponse(mockAttendanceData);
      }
      return jsonResponse([], 404);
    },
    async () => {
      const result = await tool.execute(
        {
          activityType: 'inactive',
          role: 'greeter',
          targetStartDate: '2026-10-01',
          targetEndDate: '2026-10-31',
          limit: 50,
        },
        MOCK_TOOL_OPTIONS,
      );

      if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
        throw new Error('Expected object result');
      }

      if ('error' in result) {
        throw new Error(`Unexpected error: ${result.error}`);
      }

      assertEquals(result.total_inactive_count, 1);
      assertEquals(result.inactive_volunteers?.[0].token, 'USR_INACTIVE');
      assertEquals(result.inactive_volunteers?.[0].role, 'Greeter');
    },
  );
});
