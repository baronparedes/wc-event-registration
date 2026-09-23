import { describe, expect, it } from 'vitest';

import type { AdminEventField } from '@/lib/domain/event-fields';

import { buildBulkRegistrationCsvRowSchema, buildBulkRegistrationCsvRowsSchema } from '../schemas';

describe('BulkRegistrationCsvSchema', () => {
  const mockFields: AdminEventField[] = [
    {
      id: 'field-1',
      event_id: 'event-1',
      field_key: 'custom_text',
      label: 'Custom Text',
      field_type: 'text',
      applicability: 'both',
      is_required: true,
      is_active: true,
      placeholder: null,
      help_text: null,
      options: [],
      validation_rules: {},
      display_order: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  describe('buildBulkRegistrationCsvRowSchema', () => {
    it('validates a correct row with all required fields', () => {
      const schema = buildBulkRegistrationCsvRowSchema(mockFields);

      const validData = {
        member_id: 'mem-123',
        registration_id: 'reg-456',
        answers: {
          custom_text: 'Some value',
        },
      };

      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('requires member_id', () => {
      const schema = buildBulkRegistrationCsvRowSchema(mockFields);

      const invalidData = {
        registration_id: 'reg-456',
        answers: {
          custom_text: 'Some value',
        },
      };

      const result = schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('member_id');
      }
    });

    it('makes registration_id optional', () => {
      const schema = buildBulkRegistrationCsvRowSchema(mockFields);

      const validData = {
        member_id: 'mem-123',
        answers: {
          custom_text: 'Some value',
        },
      };

      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('makes dynamic fields optional during bulk upload even if originally required', () => {
      const schema = buildBulkRegistrationCsvRowSchema(mockFields);

      const validData = {
        member_id: 'mem-123',
        answers: {},
      };

      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('buildBulkRegistrationCsvRowsSchema', () => {
    it('requires at least one row', () => {
      const schema = buildBulkRegistrationCsvRowsSchema(mockFields);

      const result = schema.safeParse([]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'At least one CSV row is required for bulk upload.',
        );
      }
    });

    it('validates multiple rows correctly', () => {
      const schema = buildBulkRegistrationCsvRowsSchema(mockFields);

      const validData = [
        {
          member_id: 'mem-1',
          answers: { custom_text: 'Value 1' },
        },
        {
          member_id: 'mem-2',
          registration_id: 'reg-2',
          answers: { custom_text: 'Value 2' },
        },
      ];

      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
