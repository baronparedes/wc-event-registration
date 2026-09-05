import { describe, expect, it } from 'vitest';

import {
  filterVisibleFieldValues,
  isFieldVisible,
  type FieldWithVisibility,
} from '../index';

describe('isFieldVisible', () => {
  const fields: FieldWithVisibility[] = [
    { field_key: 'field_a' },
    {
      field_key: 'field_b',
      validation_rules: {
        visibility_rule: {
          depends_on_field_key: 'field_a',
          equals_value: 'Others',
        },
      },
    },
    {
      field_key: 'field_c',
      validation_rules: {
        visibility_rule: {
          depends_on_field_key: 'field_b',
          equals_value: 'Yes',
        },
      },
    },
  ];

  it('returns true when field has no visibility_rule', () => {
    expect(isFieldVisible(fields[0], fields, {})).toBe(true);
  });

  it('returns true when parent field value matches (case insensitive and trimmed)', () => {
    expect(
      isFieldVisible(fields[1], fields, { field_a: '  OTHERS  ' }),
    ).toBe(true);
    expect(
      isFieldVisible(fields[1], fields, { field_a: 'others' }),
    ).toBe(true);
  });

  it('returns false when parent field value does not match', () => {
    expect(
      isFieldVisible(fields[1], fields, { field_a: 'Something Else' }),
    ).toBe(false);
    expect(
      isFieldVisible(fields[1], fields, { field_a: '' }),
    ).toBe(false);
  });

  it('handles array values (multi-select / checkboxes)', () => {
    const multiFields: FieldWithVisibility[] = [
      { field_key: 'categories' },
      {
        field_key: 'other_details',
        validation_rules: {
          visibility_rule: {
            depends_on_field_key: 'categories',
            equals_value: 'Other',
          },
        },
      },
    ];

    expect(
      isFieldVisible(multiFields[1], multiFields, {
        categories: ['Option1', '  OTHER  '],
      }),
    ).toBe(true);

    expect(
      isFieldVisible(multiFields[1], multiFields, {
        categories: ['Option1', 'Option2'],
      }),
    ).toBe(false);
  });

  it('handles object values (multi-select toggle)', () => {
    const toggleFields: FieldWithVisibility[] = [
      { field_key: 'toggles' },
      {
        field_key: 'toggle_details',
        validation_rules: {
          visibility_rule: {
            depends_on_field_key: 'toggles',
            equals_value: 'SpecialOption',
          },
        },
      },
    ];

    expect(
      isFieldVisible(toggleFields[1], toggleFields, {
        toggles: { SpecialOption: true, OtherOption: false },
      }),
    ).toBe(true);

    expect(
      isFieldVisible(toggleFields[1], toggleFields, {
        toggles: { SpecialOption: false },
      }),
    ).toBe(false);
  });

  it('handles chained dependencies correctly', () => {
    // C depends on B == Yes, B depends on A == Others
    // When A is "Others" and B is "Yes", C is visible
    expect(
      isFieldVisible(fields[2], fields, {
        field_a: 'Others',
        field_b: 'Yes',
      }),
    ).toBe(true);

    // When A is "Not Others", B is hidden, so C is also hidden even if form state has field_b: "Yes"
    expect(
      isFieldVisible(fields[2], fields, {
        field_a: 'Not Others',
        field_b: 'Yes',
      }),
    ).toBe(false);
  });

  it('prevents infinite recursion on cyclic dependencies', () => {
    const cyclicFields: FieldWithVisibility[] = [
      {
        field_key: 'x',
        validation_rules: {
          visibility_rule: { depends_on_field_key: 'y', equals_value: '1' },
        },
      },
      {
        field_key: 'y',
        validation_rules: {
          visibility_rule: { depends_on_field_key: 'x', equals_value: '1' },
        },
      },
    ];

    expect(isFieldVisible(cyclicFields[0], cyclicFields, { x: '1', y: '1' })).toBe(false);
  });
});

describe('filterVisibleFieldValues', () => {
  const fields: FieldWithVisibility[] = [
    { field_key: 'type' },
    {
      field_key: 'other_type_text',
      validation_rules: {
        visibility_rule: {
          depends_on_field_key: 'type',
          equals_value: 'Others',
        },
      },
    },
  ];

  it('keeps values for visible fields and strips hidden field values', () => {
    const formValues = {
      type: 'Standard',
      other_type_text: 'My previous entry',
    };

    const cleaned = filterVisibleFieldValues(fields, formValues);
    expect(cleaned).toEqual({
      type: 'Standard',
    });
    expect(cleaned).not.toHaveProperty('other_type_text');
  });

  it('includes values for fields that become visible', () => {
    const formValues = {
      type: 'Others',
      other_type_text: 'Custom value',
    };

    const cleaned = filterVisibleFieldValues(fields, formValues);
    expect(cleaned).toEqual({
      type: 'Others',
      other_type_text: 'Custom value',
    });
  });
});
