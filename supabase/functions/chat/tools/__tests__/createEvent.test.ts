import { assertEquals } from '@std/assert';

import { createCreateEventTool } from '../createEvent.ts';
import { MOCK_TOOL_OPTIONS, createMockClient, jsonResponse, withMockFetch } from './testHelpers.ts';

const DEFAULT_EVENT_PARAMS = {
  publicRegistrationAccess: 'members' as const,
  duplicatePolicy: 'block' as const,
  registrationMode: 'open' as const,
  allowNameLookup: false,
  sendEmailAfterCompletion: false,
  force: false,
};

Deno.test(
  'createEvent returns existing event when active event with same title exists and force is false',
  async () => {
    const client = createMockClient();
    const tool = createCreateEventTool({ client, requestId: 'req-evt-1', userId: 'usr-1' });

    const existingEvent = {
      id: 'existing-evt-id',
      title: 'Sunday Worship Service',
      slug: 'sunday-worship-service',
      status: 'draft',
      created_at: '2026-10-01T00:00:00Z',
    };

    await withMockFetch(
      (input) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.pathname.includes('/events')) {
          return jsonResponse(existingEvent);
        }
        return jsonResponse([], 404);
      },
      async () => {
        const result = await tool.execute(
          {
            ...DEFAULT_EVENT_PARAMS,
            title: 'Sunday Worship Service',
          },
          MOCK_TOOL_OPTIONS,
        );

        if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
          throw new Error('Expected object result');
        }

        assertEquals(result.already_exists, true);
        assertEquals(result.event_id, 'existing-evt-id');
        assertEquals(result.admin_url, '/admin/events/existing-evt-id');
      },
    );
  },
);

Deno.test('createEvent handles event insert error', async () => {
  const client = createMockClient();
  const tool = createCreateEventTool({ client, requestId: 'req-evt-2', userId: 'usr-1' });

  await withMockFetch(
    (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/events') && init?.method === 'POST') {
        return jsonResponse({ message: 'Insert failed due to constraint' }, 400);
      }
      if (url.pathname.includes('/events') && (!init?.method || init.method === 'GET')) {
        return jsonResponse(null); // No existing event
      }
      if (url.pathname.includes('/admins')) {
        return jsonResponse({ id: 'admin-record-1' });
      }
      return jsonResponse(null);
    },
    async () => {
      const result = await tool.execute(
        {
          ...DEFAULT_EVENT_PARAMS,
          title: 'New Unique Event',
        },
        MOCK_TOOL_OPTIONS,
      );

      if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
        throw new Error('Expected object result');
      }

      assertEquals(result.success, false);
      assertEquals(result.error, 'Insert failed due to constraint');
    },
  );
});

Deno.test('createEvent successfully creates event and event fields', async () => {
  const client = createMockClient();
  const tool = createCreateEventTool({ client, requestId: 'req-evt-3', userId: 'usr-1' });

  let insertedEvent: Record<string, unknown> | null = null;
  let insertedFields: unknown[] | null = null;

  await withMockFetch(
    (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/admins')) {
        return jsonResponse({ id: 'admin-record-1' });
      }
      if (url.pathname.includes('/event_fields') && init?.method === 'POST') {
        insertedFields = JSON.parse(String(init.body));
        return jsonResponse(null, 201);
      }
      if (url.pathname.includes('/events') && init?.method === 'POST') {
        insertedEvent = JSON.parse(String(init.body));
        return jsonResponse(null, 201);
      }
      if (url.pathname.includes('/events')) {
        return jsonResponse(null); // No existing duplicate title or slug
      }
      return jsonResponse(null, 404);
    },
    async () => {
      const result = await tool.execute(
        {
          ...DEFAULT_EVENT_PARAMS,
          title: 'Youth Camp 2026',
          startsAt: '2026-11-15T09:00',
          endsAt: '2026-11-17T17:00',
          fields: [
            {
              field_key: 'tshirt_size',
              label: 'T-Shirt Size',
              field_type: 'select',
              is_required: true,
              applicability: 'both',
              options: [
                { label: 'Small', value: 'S' },
                { label: 'Medium', value: 'M' },
              ],
            },
          ],
        },
        MOCK_TOOL_OPTIONS,
      );

      if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
        throw new Error('Expected object result');
      }

      assertEquals(result.success, true);
      assertEquals(result.already_exists, false);
      assertEquals(result.title, 'Youth Camp 2026');
      assertEquals(result.fields_created_count, 1);
      assertEquals(insertedEvent?.created_by_admin_id, 'admin-record-1');
      assertEquals(insertedEvent?.status, 'draft');
      assertEquals(Array.isArray(insertedFields), true);
      assertEquals(insertedFields?.length, 1);
    },
  );
});

Deno.test(
  'createEvent appends random suffix when slug already exists and parses date-only startsAt',
  async () => {
    const client = createMockClient();
    const tool = createCreateEventTool({ client, requestId: 'req-evt-4', userId: null });

    let insertedEvent: Record<string, unknown> | null = null;
    let getCalls = 0;

    await withMockFetch(
      (input, init) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.pathname.includes('/events') && init?.method === 'POST') {
          insertedEvent = JSON.parse(String(init.body));
          return jsonResponse(null, 201);
        }
        if (url.pathname.includes('/events')) {
          getCalls += 1;
          // First GET: title duplicate check -> returns null
          // Second GET: slug collision check -> returns existing slug record
          if (getCalls === 2) {
            return jsonResponse({ id: 'existing-slug-event' });
          }
          return jsonResponse(null);
        }
        return jsonResponse(null, 404);
      },
      async () => {
        const result = await tool.execute(
          {
            ...DEFAULT_EVENT_PARAMS,
            title: 'Special Gathering',
            slug: 'special-gathering',
            startsAt: '2026-12-25',
            publicRegistrationAccess: 'members_and_public',
          },
          MOCK_TOOL_OPTIONS,
        );

        if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
          throw new Error('Expected object result');
        }

        assertEquals(result.success, true);
        if (!result.slug) throw new Error('Expected slug in result');
        assertEquals(result.slug.startsWith('special-gathering-'), true);
        assertEquals(insertedEvent?.starts_at, '2026-12-25T08:00:00+08:00');
        assertEquals(insertedEvent?.allow_public_registrations, true);
      },
    );
  },
);
