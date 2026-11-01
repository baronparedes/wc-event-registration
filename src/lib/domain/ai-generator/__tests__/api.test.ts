import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appendEventFieldsFromBlueprint,
  appendFormFieldsFromBlueprint,
  createEventWithBlueprint,
  createFormWithBlueprint,
  generateEntityBlueprint,
} from '../api';
import type { BlueprintDynamicField, EntityBlueprintMetadata } from '../types';

const { mockEdgeFunctionCaller, mockSupabaseFrom, mockGetUser } = vi.hoisted(() => ({
  mockEdgeFunctionCaller: vi.fn(),
  mockSupabaseFrom: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('@/lib/infrastructure', () => ({
  createEdgeFunctionCaller: () => mockEdgeFunctionCaller,
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

describe('ai-generator api', () => {
  const sampleMetadata: EntityBlueprintMetadata = {
    title: 'Couples Fellowship 2026',
    slug: 'couples-fellowship-2026',
    description: 'Couples event description',
    location: 'CCF Center',
    starts_at: '2026-11-21T09:00',
    ends_at: '2026-11-21T12:00',
    registration_opens_at: '2026-11-01T08:00',
    registration_closes_at: '2026-11-20T23:59',
    audience: 'members_and_public',
    duplicate_policy: 'block',
    registration_mode: 'open',
  };

  const sampleFields: BlueprintDynamicField[] = [
    {
      field_key: 'spouse_name',
      label: "Spouse's Full Name",
      field_type: 'text',
      is_required: true,
      placeholder: 'Jane Doe',
      help_text: null,
      options: [],
      validation_rules: {},
    },
    {
      field_key: 'need_childcare',
      label: 'Require childcare?',
      field_type: 'radio',
      is_required: true,
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      validation_rules: {},
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-123' } },
      error: null,
    });
  });

  describe('generateEntityBlueprint', () => {
    it('calls edge function and returns valid blueprint', async () => {
      const mockResponse = {
        domain: 'event' as const,
        metadata: sampleMetadata,
        fields: sampleFields,
      };

      mockEdgeFunctionCaller.mockResolvedValueOnce(mockResponse);

      const result = await generateEntityBlueprint({
        domain: 'event',
        prompt: 'Couples event with spouse name',
      });

      expect(result.metadata.title).toBe('Couples Fellowship 2026');
      expect(result.fields).toHaveLength(2);
    });

    it('throws when edge function returns invalid payload', async () => {
      mockEdgeFunctionCaller.mockResolvedValueOnce(null);

      await expect(
        generateEntityBlueprint({
          domain: 'event',
          prompt: 'test prompt',
        }),
      ).rejects.toThrow('Invalid blueprint response from AI generation service');
    });
  });

  describe('createEventWithBlueprint', () => {
    it('creates event and child event_fields with admin mapping', async () => {
      const insertedRows: Record<string, unknown[]> = {
        events: [],
        event_fields: [],
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'admins') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'admin-row-789' }, error: null }),
          };
        }
        if (table === 'events') {
          return {
            insert: vi.fn().mockImplementation((payload) => {
              insertedRows.events.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        if (table === 'event_fields') {
          return {
            insert: vi.fn().mockImplementation((payload) => {
              insertedRows.event_fields.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await createEventWithBlueprint({
        metadata: sampleMetadata,
        fields: sampleFields,
      });

      expect(result.slug).toBe('couples-fellowship-2026');
      expect(typeof result.id).toBe('string');

      expect(insertedRows.events).toHaveLength(1);
      const insertedEvent = insertedRows.events[0] as Record<string, unknown>;
      expect(insertedEvent.title).toBe('Couples Fellowship 2026');
      expect(insertedEvent.created_by_admin_id).toBe('admin-row-789');
      expect(insertedEvent.allow_public_registrations).toBe(true);
      expect(insertedEvent.require_id_lookup).toBe(true);
      expect(insertedEvent.starts_at).toBe('2026-11-21T09:00');

      expect(insertedRows.event_fields).toHaveLength(1);
      const insertedFields = insertedRows.event_fields[0] as Array<Record<string, unknown>>;
      expect(insertedFields).toHaveLength(2);
      expect(insertedFields[0].field_key).toBe('spouse_name');
      expect(insertedFields[0].display_order).toBe(0);
      expect(insertedFields[1].field_key).toBe('need_childcare');
      expect(insertedFields[1].display_order).toBe(1);
    });

    it('creates event without fields if fields array is empty', async () => {
      const fieldInsertMock = vi.fn();
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'admins') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'admin-row-789' }, error: null }),
          };
        }
        if (table === 'events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'event_fields') {
          return { insert: fieldInsertMock };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await createEventWithBlueprint({
        metadata: { ...sampleMetadata, audience: 'members' },
        fields: [],
      });

      expect(result.slug).toBe('couples-fellowship-2026');
      expect(fieldInsertMock).not.toHaveBeenCalled();
    });

    it('throws when event insertion fails', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'admins') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'admin-row-789' }, error: null }),
          };
        }
        if (table === 'events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: new Error('DB write failed') }),
          };
        }
        return {};
      });

      await expect(
        createEventWithBlueprint({
          metadata: sampleMetadata,
          fields: sampleFields,
        }),
      ).rejects.toThrow('DB write failed');
    });

    it('throws when event_fields insertion fails', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'admins') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'admin-row-789' }, error: null }),
          };
        }
        if (table === 'events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'event_fields') {
          return {
            insert: vi.fn().mockResolvedValue({ error: new Error('Fields insert error') }),
          };
        }
        return {};
      });

      await expect(
        createEventWithBlueprint({
          metadata: sampleMetadata,
          fields: sampleFields,
        }),
      ).rejects.toThrow('Fields insert error');
    });
  });

  describe('createFormWithBlueprint', () => {
    it('creates form and child form_fields', async () => {
      const insertedRows: Record<string, unknown[]> = {
        forms: [],
        form_fields: [],
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'admins') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'admin-row-789' }, error: null }),
          };
        }
        if (table === 'forms') {
          return {
            insert: vi.fn().mockImplementation((payload) => {
              insertedRows.forms.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        if (table === 'form_fields') {
          return {
            insert: vi.fn().mockImplementation((payload) => {
              insertedRows.form_fields.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await createFormWithBlueprint({
        metadata: {
          ...sampleMetadata,
          title: 'Attendee Feedback Form',
          slug: 'attendee-feedback-form',
          audience: 'public',
        },
        fields: sampleFields,
      });

      expect(result.slug).toBe('attendee-feedback-form');
      expect(insertedRows.forms).toHaveLength(1);
      const insertedForm = insertedRows.forms[0] as Record<string, unknown>;
      expect(insertedForm.audience).toBe('public');
      expect(insertedForm.created_by_admin_id).toBe('admin-row-789');

      expect(insertedRows.form_fields).toHaveLength(1);
      const insertedFields = insertedRows.form_fields[0] as Array<Record<string, unknown>>;
      expect(insertedFields).toHaveLength(2);
      expect(insertedFields[0].field_applicability).toBe('all');
    });

    it('sets created_by_admin_id to null when admin lookup returns null', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const insertedRows: unknown[] = [];
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'forms') {
          return {
            insert: vi.fn().mockImplementation((payload) => {
              insertedRows.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      });

      const result = await createFormWithBlueprint({
        metadata: sampleMetadata,
        fields: [],
      });

      expect(result.slug).toBe('couples-fellowship-2026');
      expect(insertedRows).toHaveLength(1);
      expect((insertedRows[0] as Record<string, unknown>).created_by_admin_id).toBeNull();
    });
  });

  describe('appendEventFieldsFromBlueprint & appendFormFieldsFromBlueprint', () => {
    it('calculates next display_order and appends event fields', async () => {
      const insertedFields: unknown[] = [];

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'event_fields') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [{ display_order: 4 }],
              error: null,
            }),
            insert: vi.fn().mockImplementation((payload) => {
              insertedFields.push(...payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      await appendEventFieldsFromBlueprint('event-123', sampleFields);

      expect(insertedFields).toHaveLength(2);
      const f1 = insertedFields[0] as Record<string, unknown>;
      const f2 = insertedFields[1] as Record<string, unknown>;
      expect(f1.event_id).toBe('event-123');
      expect(f1.display_order).toBe(5);
      expect(f2.display_order).toBe(6);
    });

    it('calculates next display_order from 0 when table has no existing fields', async () => {
      const insertedFields: unknown[] = [];

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'form_fields') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
            insert: vi.fn().mockImplementation((payload) => {
              insertedFields.push(...payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      await appendFormFieldsFromBlueprint('form-456', sampleFields);

      expect(insertedFields).toHaveLength(2);
      const f1 = insertedFields[0] as Record<string, unknown>;
      expect(f1.form_id).toBe('form-456');
      expect(f1.display_order).toBe(0);
    });

    it('early-returns without querying DB when fields array is empty', async () => {
      await appendEventFieldsFromBlueprint('event-123', []);
      await appendFormFieldsFromBlueprint('form-456', []);
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it('throws when inserting appended event fields fails', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'event_fields') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
            insert: vi.fn().mockResolvedValue({ error: new Error('Insert failed') }),
          };
        }
        return {};
      });

      await expect(appendEventFieldsFromBlueprint('event-123', sampleFields)).rejects.toThrow(
        'Insert failed',
      );
    });
  });
});
