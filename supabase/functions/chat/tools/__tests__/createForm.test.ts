import { assertEquals } from '@std/assert';

import { createCreateFormTool } from '../createForm.ts';
import { MOCK_TOOL_OPTIONS, createMockClient, jsonResponse, withMockFetch } from './testHelpers.ts';

const DEFAULT_FORM_PARAMS = {
  audience: 'members' as const,
  duplicatePolicy: 'block' as const,
  sendEmailAfterCompletion: false,
  force: false,
};

Deno.test(
  'createForm returns existing form when active form with same title exists and force is false',
  async () => {
    const client = createMockClient();
    const tool = createCreateFormTool({ client, requestId: 'req-form-1', userId: 'usr-admin-1' });

    const existingForm = {
      id: 'existing-form-id',
      title: 'Volunteer Feedback 2026',
      slug: 'volunteer-feedback-2026',
      status: 'draft',
      created_at: '2026-10-01T00:00:00Z',
    };

    await withMockFetch(
      (input) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.pathname.includes('/forms')) {
          return jsonResponse(existingForm);
        }
        return jsonResponse([], 404);
      },
      async () => {
        const result = await tool.execute(
          {
            ...DEFAULT_FORM_PARAMS,
            title: 'Volunteer Feedback 2026',
          },
          MOCK_TOOL_OPTIONS,
        );

        if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
          throw new Error('Expected object result');
        }

        assertEquals(result.already_exists, true);
        assertEquals(result.form_id, 'existing-form-id');
        assertEquals(result.admin_url, '/admin/forms/existing-form-id');
      },
    );
  },
);

Deno.test('createForm handles form insert error', async () => {
  const client = createMockClient();
  const tool = createCreateFormTool({ client, requestId: 'req-form-2', userId: 'usr-admin-1' });

  await withMockFetch(
    (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/forms') && init?.method === 'POST') {
        return jsonResponse({ message: 'Insert constraint violated' }, 400);
      }
      if (url.pathname.includes('/forms') && (!init?.method || init.method === 'GET')) {
        return jsonResponse(null);
      }
      if (url.pathname.includes('/admins')) {
        return jsonResponse({ id: 'admin-row-1' });
      }
      return jsonResponse(null);
    },
    async () => {
      const result = await tool.execute(
        {
          ...DEFAULT_FORM_PARAMS,
          title: 'New Unique Form',
        },
        MOCK_TOOL_OPTIONS,
      );

      if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
        throw new Error('Expected object result');
      }

      assertEquals(result.success, false);
      assertEquals(result.error, 'Insert constraint violated');
    },
  );
});

Deno.test('createForm successfully creates form and form fields', async () => {
  const client = createMockClient();
  const tool = createCreateFormTool({ client, requestId: 'req-form-3', userId: 'usr-admin-1' });

  let insertedForm: Record<string, unknown> | null = null;
  let insertedFields: unknown[] | null = null;

  await withMockFetch(
    (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.includes('/admins')) {
        return jsonResponse({ id: 'admin-row-1' });
      }
      if (url.pathname.includes('/form_fields') && init?.method === 'POST') {
        insertedFields = JSON.parse(String(init.body));
        return jsonResponse(null, 201);
      }
      if (url.pathname.includes('/forms') && init?.method === 'POST') {
        insertedForm = JSON.parse(String(init.body));
        return jsonResponse(null, 201);
      }
      if (url.pathname.includes('/forms')) {
        return jsonResponse(null);
      }
      return jsonResponse(null, 404);
    },
    async () => {
      const result = await tool.execute(
        {
          ...DEFAULT_FORM_PARAMS,
          title: 'Sunday Worship Feedback',
          description: 'Share your thoughts on today service',
          fields: [
            {
              field_key: 'feedback_rating',
              label: 'How was the service?',
              field_type: 'rating',
              is_required: true,
              field_applicability: 'all',
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
      assertEquals(result.title, 'Sunday Worship Feedback');
      assertEquals(result.fields_created_count, 1);
      assertEquals(insertedForm?.created_by_admin_id, 'admin-row-1');
      assertEquals(insertedForm?.status, 'draft');
      assertEquals(Array.isArray(insertedFields), true);
      assertEquals(insertedFields?.length, 1);
    },
  );
});
