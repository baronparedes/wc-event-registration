import { describe, expect, it } from 'vitest';

import type { PublicEventFieldRow } from '../types';
import { validatePublicEventFieldConfig } from '../validation';

function buildRow(overrides: Partial<PublicEventFieldRow>): PublicEventFieldRow {
  return {
    id: 'field-1',
    event_id: 'event-1',
    field_key: 'team_name',
    label: 'Team Name',
    field_type: 'text',
    is_required: true,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 0,
    ...overrides,
  };
}

describe('validatePublicEventFieldConfig', () => {
  it('returns an issue for unsupported field types', () => {
    const result = validatePublicEventFieldConfig([
      buildRow({ field_type: 'unsupported' as PublicEventFieldRow['field_type'] }),
    ]);

    expect(result.validFields).toEqual([]);
    expect(result.issues).toEqual(['Field "team_name" has unsupported type "unsupported".']);
  });

  it('normalizes options and validation rules for selectable fields', () => {
    const result = validatePublicEventFieldConfig([
      buildRow({
        field_key: 'meal_choice',
        field_type: 'select',
        options: [
          ' Vegetarian ',
          { label: 'Gluten Free', value: ' gluten-free ' },
          { label: 'Duplicate', value: ' Vegetarian ' },
          { label: 'Missing value', value: '   ' },
          null,
        ],
        validation_rules: {
          min_length: 0,
          max_length: 10,
          pattern: '^A.*',
          min: 1,
          max: 3,
          min_selections: 2,
          max_selections: 4,
          min_date: '2026-01-01',
          max_date: '2026-12-31',
          extra: 'ignored',
        },
      }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.validFields).toHaveLength(1);
    expect(result.validFields[0]).toMatchObject({
      field_key: 'meal_choice',
      field_type: 'select',
      options: [
        { label: 'Vegetarian', value: 'Vegetarian' },
        { label: 'Gluten Free', value: 'gluten-free' },
        { label: 'Missing value', value: 'Missing value' },
      ],
      validation_rules: {
        min_length: 0,
        max_length: 10,
        pattern: '^A.*',
        min: 1,
        max: 3,
        min_selections: 2,
        max_selections: 4,
        min_date: '2026-01-01',
        max_date: '2026-12-31',
      },
    });
  });

  it('treats multi_select_toggle as an options-backed field', () => {
    const result = validatePublicEventFieldConfig([
      buildRow({
        field_key: 'session_meals',
        field_type: 'multi_select_toggle',
        options: [
          { label: '9AM', value: '9am', toggle_label: 'with Breakfast' },
          { label: '12NN', value: '12nn', toggle_label: 'with Lunch' },
        ],
      }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.validFields[0]).toMatchObject({
      field_key: 'session_meals',
      field_type: 'multi_select_toggle',
      options: [
        { label: '9AM', value: '9am', toggle_label: 'with Breakfast' },
        { label: '12NN', value: '12nn', toggle_label: 'with Lunch' },
      ],
    });
  });

  it('requires toggle labels for multi_select_toggle options', () => {
    const result = validatePublicEventFieldConfig([
      buildRow({
        field_key: 'session_meals',
        field_type: 'multi_select_toggle',
        options: [{ label: '9AM', value: '9am' }],
      }),
    ]);

    expect(result.validFields).toEqual([]);
    expect(result.issues).toEqual([
      'Field "session_meals" requires a toggle label for each option.',
    ]);
  });

  it('requires at least one valid option for selectable fields', () => {
    const result = validatePublicEventFieldConfig([
      buildRow({
        field_key: 'dietary_restrictions',
        field_type: 'radio',
        options: ['   ', null, { label: ' ', value: ' ' }],
      }),
    ]);

    expect(result.validFields).toEqual([]);
    expect(result.issues).toEqual([
      'Field "dietary_restrictions" must include at least one valid option.',
    ]);
  });

  it('keeps non-select fields valid even when options are not arrays', () => {
    const result = validatePublicEventFieldConfig([
      buildRow({
        field_key: 'notes',
        field_type: 'textarea',
        options: { unexpected: true },
        validation_rules: null,
      }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.validFields[0]).toMatchObject({
      field_key: 'notes',
      field_type: 'textarea',
      options: [],
      validation_rules: {},
    });
  });

  it('keeps only positive integer max_slots entries and ignores unset or invalid ones', () => {
    const result = validatePublicEventFieldConfig([
      buildRow({
        field_key: 'timeslot',
        field_type: 'multi_select',
        options: [
          { label: 'Morning', value: 'morning' },
          { label: 'Afternoon', value: 'afternoon' },
        ],
        validation_rules: {
          max_slots: {
            morning: 20,
            afternoon: 0,
            invalid_string: '30',
          },
        },
      }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.validFields[0]?.validation_rules.max_slots).toEqual({
      morning: 20,
    });
  });

  it('parses role-based slot allotments with valid role text and valid limits', () => {
    const result = validatePublicEventFieldConfig([
      buildRow({
        field_key: 'timeslot',
        field_type: 'multi_select',
        options: [{ label: 'Morning', value: 'morning' }],
        validation_rules: {
          max_slots_role_allotments: {
            morning: [
              { role: ' volunteer ', alloted_slots: 4 },
              { role: 'Invalid', alloted_slots: 0 },
            ],
          },
        },
      }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.validFields[0]?.validation_rules.max_slots_role_allotments).toEqual({
      morning: [{ role: 'volunteer', alloted_slots: 4 }],
    });
  });

  it('keeps backward compatibility for legacy role-keyed allotment object shape', () => {
    const result = validatePublicEventFieldConfig([
      buildRow({
        field_key: 'timeslot',
        field_type: 'multi_select',
        options: [{ label: 'Morning', value: 'morning' }],
        validation_rules: {
          max_slots_role_allotments: {
            morning: {
              volunteer: 4,
              OIC: null,
            },
          },
        },
      }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.validFields[0]?.validation_rules.max_slots_role_allotments).toEqual({
      morning: [{ role: 'volunteer', alloted_slots: 4 }],
    });
  });

  it('auto-resolves mixed role allotments by keeping wildcard only', () => {
    const result = validatePublicEventFieldConfig([
      buildRow({
        field_key: 'timeslot',
        field_type: 'multi_select',
        options: [{ label: 'Morning', value: 'morning' }],
        validation_rules: {
          max_slots_role_allotments: {
            morning: [
              { role: 'volunteer', alloted_slots: 4 },
              { role: '*', alloted_slots: 2 },
              { role: 'usher', alloted_slots: 3 },
            ],
          },
        },
      }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.validFields[0]?.validation_rules.max_slots_role_allotments).toEqual({
      morning: [{ role: '*', alloted_slots: 2 }],
    });
  });

  it('prefers wildcard when legacy role-keyed object includes wildcard and named roles', () => {
    const result = validatePublicEventFieldConfig([
      buildRow({
        field_key: 'timeslot',
        field_type: 'multi_select',
        options: [{ label: 'Morning', value: 'morning' }],
        validation_rules: {
          max_slots_role_allotments: {
            morning: {
              volunteer: 4,
              '*': 3,
              usher: 2,
            },
          },
        },
      }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.validFields[0]?.validation_rules.max_slots_role_allotments).toEqual({
      morning: [{ role: '*', alloted_slots: 3 }],
    });
  });

  it('normalizes allowed weekdays and drops invalid weekday values', () => {
    const result = validatePublicEventFieldConfig([
      buildRow({
        field_key: 'service_date',
        field_type: 'date',
        validation_rules: {
          allowed_weekdays: [2, 4, 4, -1, 8, 0],
        },
      }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.validFields[0]?.validation_rules.allowed_weekdays).toEqual([0, 2, 4]);
  });

  it('preserves unique key component validation flag', () => {
    const result = validatePublicEventFieldConfig([
      buildRow({
        field_key: 'request_date',
        field_type: 'date',
        validation_rules: {
          unique_key_component: true,
        },
      }),
    ]);

    expect(result.issues).toEqual([]);
    expect(result.validFields[0]?.validation_rules.unique_key_component).toBe(true);
  });
});
