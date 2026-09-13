import { describe, expect, it } from 'vitest';

import type { FormField } from '@/lib/domain/forms';

import { toPublicField } from '../field-helpers';

describe('field-helpers', () => {
  const baseField: FormField = {
    id: 'field-1',
    form_id: 'form-1',
    field_key: 'test_key',
    label: 'Test Label',
    field_type: 'text',
    field_applicability: 'all',
    is_required: true,
    is_active: true,
    placeholder: 'Test placeholder',
    help_text: 'Help text',
    options: [{ label: 'A', value: 'a' }],
    validation_rules: { min_length: 3 },
    display_order: 1,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  it('maps "all" applicability to "both"', () => {
    const result = toPublicField({ ...baseField, field_applicability: 'all' });
    expect(result.applicability).toBe('both');
    expect(result.event_id).toBe('form-1');
  });

  it('maps "member_only" applicability to "members"', () => {
    const result = toPublicField({ ...baseField, field_applicability: 'member_only' });
    expect(result.applicability).toBe('members');
  });

  it('maps "public_only" applicability to "guests"', () => {
    const result = toPublicField({ ...baseField, field_applicability: 'public_only' });
    expect(result.applicability).toBe('guests');
  });

  it('handles empty options and null validation rules', () => {
    const result = toPublicField({
      ...baseField,
      options: undefined as unknown as [],
      validation_rules: undefined as unknown as Record<string, unknown>,
    });
    expect(result.options).toEqual([]);
    expect(result.validation_rules).toEqual({});
  });
});
