import { describe, expect, it } from 'vitest';

import type { DynamicFieldLike } from '../types';
import { buildDynamicFieldResponseSchema, buildSchemaForField } from '../validation';

describe('dynamic-fields validation', () => {
  describe('buildSchemaForField', () => {
    it('validates required text fields and pattern rules', () => {
      const field: DynamicFieldLike = {
        field_key: 'company',
        label: 'Company',
        field_type: 'text',
        is_required: true,
        validation_rules: {
          pattern: '^[A-Z]',
        },
      };

      const schema = buildSchemaForField(field);
      expect(schema.safeParse('Acme Inc').success).toBe(true);
      expect(schema.safeParse('acme').success).toBe(false);
      expect(schema.safeParse('').success).toBe(false);
      expect(schema.safeParse(undefined).success).toBe(false);
    });

    it('handles malformed regex pattern gracefully', () => {
      const field: DynamicFieldLike = {
        field_key: 'company',
        label: 'Company',
        field_type: 'text',
        is_required: false,
        validation_rules: {
          pattern: '[unclosed',
        },
      };

      const schema = buildSchemaForField(field);
      expect(schema.safeParse('Acme').success).toBe(true);
    });

    it('validates optional text with min/max length', () => {
      const field: DynamicFieldLike = {
        field_key: 'notes',
        label: 'Notes',
        field_type: 'textarea',
        is_required: false,
        validation_rules: { min_length: 5, max_length: 20 },
      };

      const schema = buildSchemaForField(field);
      expect(schema.safeParse('').success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(true);
      expect(schema.safeParse('hello world').success).toBe(true);
      expect(schema.safeParse('hi').success).toBe(false);
    });

    it('validates number fields with min/max and string coercion', () => {
      const field: DynamicFieldLike = {
        field_key: 'age',
        label: 'Age',
        field_type: 'number',
        is_required: true,
        validation_rules: { min: 18, max: 65 },
      };

      const schema = buildSchemaForField(field);
      expect(schema.safeParse(25).success).toBe(true);
      expect(schema.safeParse('30').success).toBe(true);
      expect(schema.safeParse(15).success).toBe(false);
      expect(schema.safeParse(70).success).toBe(false);
      expect(schema.safeParse('').success).toBe(false);
    });

    it('validates email fields', () => {
      const field: DynamicFieldLike = {
        field_key: 'email',
        label: 'Email',
        field_type: 'email',
        is_required: true,
      };

      const schema = buildSchemaForField(field);
      expect(schema.safeParse('test@example.com').success).toBe(true);
      expect(schema.safeParse('invalid-email').success).toBe(false);
    });

    it('validates phone fields', () => {
      const field: DynamicFieldLike = {
        field_key: 'phone',
        label: 'Phone',
        field_type: 'phone',
        is_required: true,
      };

      const schema = buildSchemaForField(field);
      expect(schema.safeParse('09171234567').success).toBe(true);
      expect(schema.safeParse('+639171234567').success).toBe(true);
    });

    it('validates date fields with min/max date and max_past_days', () => {
      const field: DynamicFieldLike = {
        field_key: 'event_date',
        label: 'Event Date',
        field_type: 'date',
        is_required: true,
        validation_rules: {
          min_date: '2026-01-01',
          max_date: '2026-12-31',
        },
      };

      const schema = buildSchemaForField(field);
      expect(schema.safeParse('2026-06-15').success).toBe(true);
      expect(schema.safeParse('2025-12-31').success).toBe(false);
      expect(schema.safeParse('2027-01-01').success).toBe(false);
    });

    it('validates rating scale within bounds', () => {
      const field: DynamicFieldLike = {
        field_key: 'satisfaction',
        label: 'Satisfaction',
        field_type: 'rating',
        is_required: true,
        validation_rules: { min: 1, max: 10 },
      };

      const schema = buildSchemaForField(field);
      expect(schema.safeParse(5).success).toBe(true);
      expect(schema.safeParse(10).success).toBe(true);
      expect(schema.safeParse(11).success).toBe(false);
      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse('8').success).toBe(true);
    });

    it('validates select / radio fields against options', () => {
      const field: DynamicFieldLike = {
        field_key: 'size',
        label: 'Size',
        field_type: 'select',
        is_required: true,
        options: [
          { label: 'Small', value: 's' },
          { label: 'Medium', value: 'm' },
        ],
      };

      const schema = buildSchemaForField(field);
      expect(schema.safeParse('s').success).toBe(true);
      expect(schema.safeParse('xl').success).toBe(false);
      expect(schema.safeParse('').success).toBe(false);
    });

    it('validates multiselect selections count', () => {
      const field: DynamicFieldLike = {
        field_key: 'hobbies',
        label: 'Hobbies',
        field_type: 'multi_select',
        is_required: true,
        options: [
          { label: 'Coding', value: 'coding' },
          { label: 'Music', value: 'music' },
          { label: 'Sports', value: 'sports' },
        ],
        validation_rules: { min_selections: 1, max_selections: 2 },
      };

      const schema = buildSchemaForField(field);
      expect(schema.safeParse(['coding']).success).toBe(true);
      expect(schema.safeParse(['coding', 'music']).success).toBe(true);
      expect(schema.safeParse(['coding', 'music', 'sports']).success).toBe(false);
      expect(schema.safeParse(['invalid']).success).toBe(false);
      expect(schema.safeParse([]).success).toBe(false);
    });

    it('validates multiselect_toggle structure and toggle choices', () => {
      const field: DynamicFieldLike = {
        field_key: 'sessions',
        label: 'Sessions',
        field_type: 'multi_select_toggle',
        is_required: true,
        options: [
          { label: 'Keynote', value: 'keynote' },
          { label: 'Workshop', value: 'workshop' },
        ],
      };

      const schema = buildSchemaForField(field);
      expect(schema.safeParse({ keynote: true }).success).toBe(true);
      expect(schema.safeParse({ keynote: false, workshop: true }).success).toBe(true);
      // Pending toggle choice (null) is disallowed
      expect(schema.safeParse({ keynote: null }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });

    it('validates boolean / checkbox fields', () => {
      const requiredCheckbox: DynamicFieldLike = {
        field_key: 'consent',
        label: 'Consent',
        field_type: 'checkbox',
        is_required: true,
      };

      const schema = buildSchemaForField(requiredCheckbox);
      expect(schema.safeParse(true).success).toBe(true);
      expect(schema.safeParse(false).success).toBe(false);

      const optionalCheckbox: DynamicFieldLike = {
        field_key: 'opt_in',
        label: 'Opt In',
        field_type: 'checkbox',
        is_required: false,
      };
      const optSchema = buildSchemaForField(optionalCheckbox);
      expect(optSchema.safeParse(false).success).toBe(true);
      expect(optSchema.safeParse(undefined).success).toBe(true);
    });
  });

  describe('buildDynamicFieldResponseSchema', () => {
    it('builds a composite schema for a collection of fields', () => {
      const fields: DynamicFieldLike[] = [
        { field_key: 'name', label: 'Name', field_type: 'text', is_required: true },
        {
          field_key: 'rating',
          label: 'Rating',
          field_type: 'rating',
          is_required: false,
          validation_rules: { max: 5 },
        },
      ];

      const formSchema = buildDynamicFieldResponseSchema(fields);
      expect(formSchema.safeParse({ name: 'Alice', rating: 4 }).success).toBe(true);
      expect(formSchema.safeParse({ name: 'Alice' }).success).toBe(true);
      expect(formSchema.safeParse({ rating: 4 }).success).toBe(false);
    });
  });
});
