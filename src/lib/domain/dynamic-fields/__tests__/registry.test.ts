import { describe, expect, it } from 'vitest';

import {
  DYNAMIC_FIELD_TYPES,
  DYNAMIC_FIELD_TYPE_COLORS,
  DYNAMIC_FIELD_TYPE_LABELS,
  FIELD_TYPE_REGISTRY,
  dynamicFieldHasDateValidation,
  dynamicFieldHasMultiSelectValidation,
  dynamicFieldHasNumberValidation,
  dynamicFieldHasOptions,
  dynamicFieldHasRatingValidation,
  dynamicFieldHasTextValidation,
  dynamicFieldHasValidation,
  getFieldDefinition,
  getFieldTypesForDomain,
} from '../index';

describe('dynamic-fields registry', () => {
  it('contains complete definitions for all 15 dynamic field types', () => {
    expect(DYNAMIC_FIELD_TYPES.length).toBe(15);
    for (const type of DYNAMIC_FIELD_TYPES) {
      const def = getFieldDefinition(type);
      expect(def).toBeDefined();
      expect(def.type).toBe(type);
      expect(def.label).toBeTruthy();
      expect(def.colorClass).toBeTruthy();
      expect(def.domains.length).toBeGreaterThan(0);
      expect(typeof def.formatValue).toBe('function');
    }
  });

  it('filters field types by domain correctly', () => {
    const eventTypes = getFieldTypesForDomain('events');
    const formTypes = getFieldTypesForDomain('forms');
    const attendanceTypes = getFieldTypesForDomain('attendance');

    expect(eventTypes).toContain('rating');
    expect(formTypes).toContain('rating');
    expect(attendanceTypes).toContain('rating');

    // Forms should not include color_picker or multi_select_toggle unless enabled
    expect(formTypes).not.toContain('color_picker');
    expect(formTypes).not.toContain('multi_select_toggle');

    expect(eventTypes).toContain('multi_select_toggle');
    expect(attendanceTypes).toContain('color_picker');
  });

  it('correctly maps option and validation flags', () => {
    expect(dynamicFieldHasOptions('select')).toBe(true);
    expect(dynamicFieldHasOptions('radio')).toBe(true);
    expect(dynamicFieldHasOptions('multi_select')).toBe(true);
    expect(dynamicFieldHasOptions('text')).toBe(false);

    expect(dynamicFieldHasTextValidation('text')).toBe(true);
    expect(dynamicFieldHasTextValidation('email')).toBe(true);
    expect(dynamicFieldHasTextValidation('number')).toBe(false);

    expect(dynamicFieldHasNumberValidation('number')).toBe(true);
    expect(dynamicFieldHasNumberValidation('rating')).toBe(false);

    expect(dynamicFieldHasRatingValidation('rating')).toBe(true);
    expect(dynamicFieldHasRatingValidation('number')).toBe(false);

    expect(dynamicFieldHasMultiSelectValidation('multi_select')).toBe(true);
    expect(dynamicFieldHasMultiSelectValidation('select')).toBe(false);

    expect(dynamicFieldHasDateValidation('date')).toBe(true);
    expect(dynamicFieldHasDateValidation('datetime')).toBe(true);
    expect(dynamicFieldHasDateValidation('text')).toBe(false);

    expect(dynamicFieldHasValidation('rating')).toBe(true);
    expect(dynamicFieldHasValidation('checkbox')).toBe(false);
  });

  it('formats values correctly across diverse field types', () => {
    // Text & Textarea
    expect(FIELD_TYPE_REGISTRY.text.formatValue('Hello world')).toBe('Hello world');
    expect(FIELD_TYPE_REGISTRY.text.formatValue(null)).toBe('');
    expect(FIELD_TYPE_REGISTRY.text.formatValue(undefined)).toBe('');
    expect(FIELD_TYPE_REGISTRY.textarea.formatValue('Multi\nline')).toBe('Multi\nline');
    expect(FIELD_TYPE_REGISTRY.textarea.formatValue(null)).toBe('');

    // Number
    expect(FIELD_TYPE_REGISTRY.number.formatValue(42)).toBe('42');
    expect(FIELD_TYPE_REGISTRY.number.formatValue('')).toBe('');
    expect(FIELD_TYPE_REGISTRY.number.formatValue(null)).toBe('');

    // Email & Phone
    expect(FIELD_TYPE_REGISTRY.email.formatValue('test@example.com')).toBe('test@example.com');
    expect(FIELD_TYPE_REGISTRY.email.formatValue(null)).toBe('');
    expect(FIELD_TYPE_REGISTRY.phone.formatValue('+639123456789')).toBe('+639123456789');
    expect(FIELD_TYPE_REGISTRY.phone.formatValue(null)).toBe('');

    // Single select with options lookup
    expect(
      FIELD_TYPE_REGISTRY.select.formatValue('opt_a', {
        options: [{ label: 'Option A', value: 'opt_a' }],
      }),
    ).toBe('Option A');
    expect(FIELD_TYPE_REGISTRY.select.formatValue('unknown_opt', {})).toBe('unknown_opt');
    expect(FIELD_TYPE_REGISTRY.select.formatValue('')).toBe('');
    expect(FIELD_TYPE_REGISTRY.select.formatValue(null)).toBe('');

    // Radio
    expect(
      FIELD_TYPE_REGISTRY.radio.formatValue('opt_1', {
        options: [{ label: 'Radio 1', value: 'opt_1' }],
      }),
    ).toBe('Radio 1');
    expect(FIELD_TYPE_REGISTRY.radio.formatValue('unmatched', {})).toBe('unmatched');
    expect(FIELD_TYPE_REGISTRY.radio.formatValue('')).toBe('');
    expect(FIELD_TYPE_REGISTRY.radio.formatValue(null)).toBe('');

    // Checkbox
    expect(FIELD_TYPE_REGISTRY.checkbox.formatValue(true)).toBe('Yes');
    expect(FIELD_TYPE_REGISTRY.checkbox.formatValue('true')).toBe('Yes');
    expect(FIELD_TYPE_REGISTRY.checkbox.formatValue(false)).toBe('No');
    expect(FIELD_TYPE_REGISTRY.checkbox.formatValue(null)).toBe('No');

    // Multi-select with options lookup
    expect(
      FIELD_TYPE_REGISTRY.multi_select.formatValue(['opt_1', 'opt_2'], {
        options: [
          { label: 'First', value: 'opt_1' },
          { label: 'Second', value: 'opt_2' },
        ],
      }),
    ).toBe('First, Second');
    expect(FIELD_TYPE_REGISTRY.multi_select.formatValue(['unmapped_1', 'unmapped_2'])).toBe(
      'unmapped_1, unmapped_2',
    );
    expect(FIELD_TYPE_REGISTRY.multi_select.formatValue([])).toBe('');
    expect(FIELD_TYPE_REGISTRY.multi_select.formatValue(null)).toBe('');

    // Multi-select toggle
    expect(
      FIELD_TYPE_REGISTRY.multi_select_toggle.formatValue(
        { opt_1: true, opt_2: false },
        {
          options: [
            { label: 'First', value: 'opt_1' },
            { label: 'Second', value: 'opt_2' },
          ],
        },
      ),
    ).toBe('First: Yes, Second: No');
    expect(FIELD_TYPE_REGISTRY.multi_select_toggle.formatValue({ raw_key: true })).toBe(
      'raw_key: Yes',
    );
    expect(FIELD_TYPE_REGISTRY.multi_select_toggle.formatValue({})).toBe('');
    expect(FIELD_TYPE_REGISTRY.multi_select_toggle.formatValue('invalid')).toBe('');
    expect(FIELD_TYPE_REGISTRY.multi_select_toggle.formatValue(null)).toBe('');

    // Date & Datetime
    expect(FIELD_TYPE_REGISTRY.date.formatValue('2026-10-06')).toBe('2026-10-06');
    expect(FIELD_TYPE_REGISTRY.date.formatValue(null)).toBe('');
    expect(FIELD_TYPE_REGISTRY.datetime.formatValue('2026-10-06T14:00:00Z')).toBe(
      '2026-10-06T14:00:00Z',
    );
    expect(FIELD_TYPE_REGISTRY.datetime.formatValue(null)).toBe('');

    // Boolean
    expect(FIELD_TYPE_REGISTRY.boolean.formatValue(true)).toBe('Yes');
    expect(FIELD_TYPE_REGISTRY.boolean.formatValue('true')).toBe('Yes');
    expect(FIELD_TYPE_REGISTRY.boolean.formatValue(false)).toBe('No');
    expect(FIELD_TYPE_REGISTRY.boolean.formatValue(null)).toBe('No');

    // Color picker
    expect(FIELD_TYPE_REGISTRY.color_picker.formatValue('#3b82f6')).toBe('#3b82f6');
    expect(FIELD_TYPE_REGISTRY.color_picker.formatValue(null)).toBe('');

    // Rating
    expect(FIELD_TYPE_REGISTRY.rating.formatValue(4, { rules: { max: 5 } })).toBe('4 / 5 ★');
    expect(FIELD_TYPE_REGISTRY.rating.formatValue(8, { rules: { max: 10 } })).toBe('8 / 10 ★');
    expect(FIELD_TYPE_REGISTRY.rating.formatValue(3)).toBe('3 / 5 ★');
    expect(FIELD_TYPE_REGISTRY.rating.formatValue('')).toBe('');
    expect(FIELD_TYPE_REGISTRY.rating.formatValue(null)).toBe('');
  });

  it('provides consistent badge colors and labels lookup', () => {
    expect(DYNAMIC_FIELD_TYPE_COLORS.rating).toBe('bg-amber-100 text-amber-800');
    expect(DYNAMIC_FIELD_TYPE_LABELS.rating).toBe('Rating');
    expect(DYNAMIC_FIELD_TYPE_LABELS.text).toBe('Single Line Text');
  });

  it('safely handles non-existent field types in helper predicates', () => {
    // @ts-expect-error - testing invalid field type safety
    expect(dynamicFieldHasOptions('unknown_type')).toBe(false);
    // @ts-expect-error - testing invalid field type safety
    expect(dynamicFieldHasValidation('unknown_type')).toBe(false);
    // @ts-expect-error - testing invalid field type safety
    expect(dynamicFieldHasTextValidation('unknown_type')).toBe(false);
    // @ts-expect-error - testing invalid field type safety
    expect(dynamicFieldHasNumberValidation('unknown_type')).toBe(false);
    // @ts-expect-error - testing invalid field type safety
    expect(dynamicFieldHasRatingValidation('unknown_type')).toBe(false);
    // @ts-expect-error - testing invalid field type safety
    expect(dynamicFieldHasMultiSelectValidation('unknown_type')).toBe(false);
    // @ts-expect-error - testing invalid field type safety
    expect(dynamicFieldHasDateValidation('unknown_type')).toBe(false);
  });
});
