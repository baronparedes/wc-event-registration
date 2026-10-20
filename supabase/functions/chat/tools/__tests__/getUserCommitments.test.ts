import { assertEquals } from '@std/assert';

import { createGetUserCommitmentsTool } from '../getUserCommitments.ts';
import { MOCK_TOOL_OPTIONS, createMockClient, jsonResponse, withMockFetch } from './testHelpers.ts';

Deno.test('getUserCommitments returns empty when no Sundays in range', async () => {
  const client = createMockClient();
  const tool = createGetUserCommitmentsTool({ client, requestId: 'req-commitments-1' });

  await withMockFetch(
    () => jsonResponse([]),
    async () => {
      const result = await tool.execute(
        {
          targetStartDate: '2026-10-17',
          targetEndDate: '2026-10-17',
        },
        MOCK_TOOL_OPTIONS,
      );

      if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
        throw new Error('Expected object result');
      }

      assertEquals(result.count, 0);
      assertEquals(result.note, 'No Sundays found within the specified date range.');
    },
  );
});

Deno.test('getUserCommitments handles token lookup not found', async () => {
  const client = createMockClient();
  const tool = createGetUserCommitmentsTool({ client, requestId: 'req-commitments-2' });

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
          targetStartDate: '2026-10-18',
          targetEndDate: '2026-10-18',
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
});

Deno.test('getUserCommitments handles query error', async () => {
  const client = createMockClient();
  const tool = createGetUserCommitmentsTool({ client, requestId: 'req-commitments-3' });

  await withMockFetch(
    () => jsonResponse({ message: 'DB query error' }, 500),
    async () => {
      const result = await tool.execute(
        {
          targetStartDate: '2026-10-18',
          targetEndDate: '2026-10-18',
        },
        MOCK_TOOL_OPTIONS,
      );

      assertEquals(result, { error: 'DB query error' });
    },
  );
});

Deno.test('getUserCommitments breaks down commitments across Sunday slots', async () => {
  const client = createMockClient();
  const tool = createGetUserCommitmentsTool({ client, requestId: 'req-commitments-4' });

  // 2026-10-18 is 3rd Sunday of October
  const mockUsers = [
    {
      id: 'user-1',
      role: 'Usher',
      metadata: {
        third_sunday: '9AM, 12NN',
      },
      user_tokens: [{ token: 'USR_001' }],
    },
    {
      id: 'user-2',
      role: 'Greeter',
      metadata: {
        third_sunday: '9AM',
      },
      user_tokens: [{ token: 'USR_002' }],
    },
  ];

  await withMockFetch(
    (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/users')) {
        return jsonResponse(mockUsers);
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

      assertEquals(result.count, 2);
      assertEquals(result.tokens, ['USR_001', 'USR_002']);
      const breakdown = result.service_breakdown as Record<string, { count: number }>;
      assertEquals(breakdown['9AM']?.count, 2);
      assertEquals(breakdown['12NN']?.count, 1);
      assertEquals(breakdown['3PM']?.count, 0);
    },
  );
});
