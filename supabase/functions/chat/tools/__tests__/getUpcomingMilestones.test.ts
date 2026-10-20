import { assertEquals } from '@std/assert';

import { createGetUpcomingMilestonesTool } from '../getUpcomingMilestones.ts';
import { MOCK_TOOL_OPTIONS, createMockClient, jsonResponse, withMockFetch } from './testHelpers.ts';

Deno.test('getUpcomingMilestones handles database error', async () => {
  const client = createMockClient();
  const tool = createGetUpcomingMilestonesTool({ client, requestId: 'req-2' });

  await withMockFetch(
    () => jsonResponse({ message: 'DB connection failure' }, 500),
    async () => {
      const result = await tool.execute(
        {
          targetStartDate: '2026-10-01',
          targetEndDate: '2026-10-31',
        },
        MOCK_TOOL_OPTIONS,
      );
      assertEquals(result, { error: 'DB connection failure' });
    },
  );
});

Deno.test('getUpcomingMilestones uses this_month fallback when dates are omitted', async () => {
  const client = createMockClient();
  const tool = createGetUpcomingMilestonesTool({ client, requestId: 'req-fallback' });

  await withMockFetch(
    (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/users')) {
        return jsonResponse([]);
      }
      return jsonResponse([], 404);
    },
    async () => {
      const rawResult = await tool.execute({}, MOCK_TOOL_OPTIONS);
      if (!rawResult || typeof rawResult !== 'object' || Symbol.asyncIterator in rawResult) {
        throw new Error('Expected object result');
      }
      if ('error' in rawResult) {
        throw new Error(`Expected success but got error: ${rawResult.error}`);
      }
      assertEquals(rawResult.total_count, 0);
      assertEquals(typeof rawResult.timeframe.start_date, 'string');
    },
  );
});

Deno.test('getUpcomingMilestones parses birthdays and wedding anniversaries', async () => {
  const client = createMockClient();
  const tool = createGetUpcomingMilestonesTool({ client, requestId: 'req-3' });

  const mockUsers = [
    {
      date_of_birth: '1990-10-15',
      metadata: { wedanniv_date: '2015-10-20' },
      user_tokens: [{ token: 'USR_001' }],
    },
    {
      date_of_birth: null,
      metadata: { dob_month: 10, dob_day: 25 },
      user_tokens: [{ token: 'USR_002' }],
    },
    {
      date_of_birth: '1985-11-01', // Outside October range
      metadata: null,
      user_tokens: { token: 'USR_003' },
    },
    {
      date_of_birth: 'invalid-date',
      metadata: 'invalid-metadata',
      user_tokens: [],
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
      const rawResult = await tool.execute(
        {
          targetStartDate: '2026-10-01',
          targetEndDate: '2026-10-31',
        },
        MOCK_TOOL_OPTIONS,
      );

      if (!rawResult || typeof rawResult !== 'object' || Symbol.asyncIterator in rawResult) {
        throw new Error('Expected object result');
      }

      if ('error' in rawResult) {
        throw new Error(`Expected success but got error: ${rawResult.error}`);
      }

      assertEquals(rawResult.birthdays.count, 2);
      assertEquals(rawResult.birthdays.tokens, ['USR_001', 'USR_002']);
      assertEquals(rawResult.wedding_anniversaries.count, 1);
      assertEquals(rawResult.wedding_anniversaries.tokens, ['USR_001']);
      assertEquals(rawResult.total_count, 3);
    },
  );
});
