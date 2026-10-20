import { assertEquals } from '@std/assert';

import { createGetUnexcusedVolunteersTool } from '../getUnexcusedVolunteers.ts';
import { MOCK_TOOL_OPTIONS, createMockClient, jsonResponse, withMockFetch } from './testHelpers.ts';

Deno.test(
  'getUnexcusedVolunteers returns count 0 for future date range without past Sundays',
  async () => {
    const client = createMockClient();
    const tool = createGetUnexcusedVolunteersTool({ client, requestId: 'req-unexcused-1' });

    const result = await tool.execute(
      {
        targetStartDate: '2099-10-01',
        targetEndDate: '2099-10-07',
      },
      MOCK_TOOL_OPTIONS,
    );

    if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
      throw new Error('Expected object result');
    }

    assertEquals(result.count, 0);
    assertEquals(result.volunteers, []);
  },
);

Deno.test(
  'getUnexcusedVolunteers returns early when provided userTokens are not found',
  async () => {
    const client = createMockClient();
    const tool = createGetUnexcusedVolunteersTool({ client, requestId: 'req-unexcused-2' });

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
            userTokens: ['NON_EXISTENT_TOKEN'],
            targetStartDate: '2024-01-07',
            targetEndDate: '2024-01-07',
          },
          MOCK_TOOL_OPTIONS,
        );

        if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
          throw new Error('Expected object result');
        }

        assertEquals(result.count, 0);
        assertEquals(result.note, 'No volunteers found matching tokens: NON_EXISTENT_TOKEN.');
      },
    );
  },
);

Deno.test('getUnexcusedVolunteers handles users query error', async () => {
  const client = createMockClient();
  const tool = createGetUnexcusedVolunteersTool({ client, requestId: 'req-unexcused-3' });

  await withMockFetch(
    (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/users')) {
        return jsonResponse({ message: 'Users table error' }, 500);
      }
      return jsonResponse([], 404);
    },
    async () => {
      const result = await tool.execute(
        {
          targetStartDate: '2024-01-07',
          targetEndDate: '2024-01-07',
        },
        MOCK_TOOL_OPTIONS,
      );

      assertEquals(result, { error: 'Failed to retrieve volunteers.' });
    },
  );
});

Deno.test('getUnexcusedVolunteers correctly identifies unexcused absences', async () => {
  const client = createMockClient();
  const tool = createGetUnexcusedVolunteersTool({ client, requestId: 'req-unexcused-4' });

  // 2024-01-07 was the 1st Sunday of Jan 2024
  const mockUsers = [
    {
      id: 'user-absent',
      role: 'Usher',
      metadata: { first_sunday: '9AM, 12NN' },
      user_tokens: [{ token: 'USR_ABSENT' }],
    },
    {
      id: 'user-checked-in',
      role: 'Usher',
      metadata: { first_sunday: '9AM' },
      user_tokens: [{ token: 'USR_CHECKED' }],
    },
    {
      id: 'user-excused',
      role: 'Usher',
      metadata: { first_sunday: '9AM' },
      user_tokens: [{ token: 'USR_EXCUSED' }],
    },
  ];

  const mockExcuses = [
    {
      user_id: 'user-excused',
      request_date: '2024-01-07',
    },
  ];

  const mockAttendance = [
    {
      id: 'att-1',
      user_id: 'user-checked-in',
      service_date: '2024-01-07',
      checked_in_at: '2024-01-07T08:55:00Z',
      time_slot: '9AM',
      users: { id: 'user-checked-in', user_tokens: [{ token: 'USR_CHECKED' }] },
    },
  ];

  await withMockFetch(
    (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/rest/v1/users')) {
        return jsonResponse(mockUsers);
      }
      if (url.pathname.includes('/rest/v1/service_excuse_requests')) {
        return jsonResponse(mockExcuses);
      }
      if (url.pathname.includes('/rest/v1/service_attendance')) {
        return jsonResponse(mockAttendance);
      }
      return jsonResponse([], 404);
    },
    async () => {
      const result = await tool.execute(
        {
          role: 'usher',
          targetStartDate: '2024-01-07',
          targetEndDate: '2024-01-07',
        },
        MOCK_TOOL_OPTIONS,
      );

      if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
        throw new Error('Expected object result');
      }

      if ('error' in result) {
        throw new Error(`Unexpected error: ${result.error}`);
      }

      assertEquals(result.count, 1);
      assertEquals(result.tokens, ['USR_ABSENT']);
      assertEquals(result.volunteers[0].token, 'USR_ABSENT');
      assertEquals(result.volunteers[0].role, 'Usher');
    },
  );
});
