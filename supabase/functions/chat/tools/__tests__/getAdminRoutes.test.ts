import { assertEquals } from '@std/assert';

import { createGetAdminRoutesTool } from '../getAdminRoutes.ts';
import { MOCK_TOOL_OPTIONS, createMockClient } from './testHelpers.ts';

Deno.test('getAdminRoutes resolves static routes without id', async () => {
  const client = createMockClient();
  const tool = createGetAdminRoutesTool({ client, requestId: 'req-route-1' });

  const result = await tool.execute(
    {
      route: 'hub_calendar',
    },
    MOCK_TOOL_OPTIONS,
  );

  assertEquals(result, {
    route: 'hub_calendar',
    url: '/admin/hub-calendar',
  });
});

Deno.test('getAdminRoutes validates id requirement for entity detail routes', async () => {
  const client = createMockClient();
  const tool = createGetAdminRoutesTool({ client, requestId: 'req-route-2' });

  const resultWithoutId = await tool.execute(
    {
      route: 'event_detail',
    },
    MOCK_TOOL_OPTIONS,
  );

  assertEquals(resultWithoutId, {
    error: 'The event_detail route requires an id.',
  });

  const resultWithId = await tool.execute(
    {
      route: 'event_detail',
      id: 'evt-456',
    },
    MOCK_TOOL_OPTIONS,
  );

  assertEquals(resultWithId, {
    route: 'event_detail',
    url: '/admin/events/evt-456',
  });
});
