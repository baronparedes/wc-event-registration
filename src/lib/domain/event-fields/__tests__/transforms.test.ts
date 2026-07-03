import { describe, expect, it } from 'vitest';

import {
  type AdminEventField,
  type EventFieldFormValues,
  type PublicEventField,
  createDynamicFieldDefaultValues,
  fieldToFormValues,
  normalizeDynamicFieldAnswersForPreview,
  toValidationRules,
} from '@/lib/domain/event-fields';

function makeAdminField(overrides: Partial<AdminEventField> = {}): AdminEventField {
  return {
    id: 'c9707ebf-a95d-4f42-ba04-bde679f92ed8',
    event_id: '9a693702-90e6-499f-8835-8f57ef1ea8d7',
    field_key: 'team_name',
    label: 'Team Name',
    field_type: 'text',
    is_required: true,
    is_active: true,
    placeholder: 'Enter team name',
    help_text: 'Use official team name',
    options: [],
    validation_rules: {
      min_length: 2,
      max_length: 50,
      pattern: '^[A-Za-z ]+$',
    },
    display_order: 0,
    created_at: '2026-06-25T10:00:00.000Z',
    updated_at: '2026-06-25T10:00:00.000Z',
    ...overrides,
  };
}

function makePublicField(overrides: Partial<PublicEventField> = {}): PublicEventField {
  return {
    id: 'c9707ebf-a95d-4f42-ba04-bde679f92ed8',
    event_id: '9a693702-90e6-499f-8835-8f57ef1ea8d7',
    field_key: 'generic_field',
    label: 'Generic Field',
    field_type: 'text',
    is_required: false,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 0,
    ...overrides,
  };
}

describe('event-fields transforms', () => {
  it('converts an admin field to event field form values', () => {
    const values = fieldToFormValues(makeAdminField());

    expect(values.field_key).toBe('team_name');
    expect(values.label).toBe('Team Name');
    expect(values.val_min_length).toBe('2');
    expect(values.val_max_length).toBe('50');
    expect(values.val_pattern).toBe('^[A-Za-z ]+$');
  });

  it('builds validation rules and excludes empty values', () => {
    const values: EventFieldFormValues = {
      field_key: 'team_name',
      label: 'Team Name',
      field_type: 'text',
      is_required: true,
      is_active: true,
      placeholder: null,
      help_text: null,
      options: [],
      val_min_length: '2',
      val_max_length: '',
      val_pattern: '^[A-Za-z ]+$',
      val_min: '1',
      val_max: '10',
      val_min_selections: '',
      val_max_selections: '',
      val_min_date: '',
      val_max_date: '',
    };

    const rules = toValidationRules(values);

    expect(rules).toEqual({
      min_length: 2,
      pattern: '^[A-Za-z ]+$',
      min: 1,
      max: 10,
    });
  });

  it('builds all supported validation rule types when values are provided', () => {
    const values: EventFieldFormValues = {
      field_key: 'positions',
      label: 'Positions',
      field_type: 'multi_select',
      is_required: true,
      is_active: true,
      placeholder: null,
      help_text: null,
      options: [],
      val_min_length: '1',
      val_max_length: '5',
      val_pattern: '^x+$',
      val_min: '0.5',
      val_max: '9.5',
      val_min_selections: '2',
      val_max_selections: '4',
      val_min_date: '2026-01-01',
      val_max_date: '2026-12-31',
    };

    const rules = toValidationRules(values);

    expect(rules).toEqual({
      min_length: 1,
      max_length: 5,
      pattern: '^x+$',
      min: 0.5,
      max: 9.5,
      min_selections: 2,
      max_selections: 4,
      min_date: '2026-01-01',
      max_date: '2026-12-31',
    });
  });

  it('normalizes nullable admin field metadata into safe form defaults', () => {
    const values = fieldToFormValues(
      makeAdminField({
        placeholder: null,
        help_text: null,
        options: null as unknown as Array<{ label: string; value: string }>,
        validation_rules: {
          pattern: 123 as unknown as string,
          min_date: 42 as unknown as string,
          max_date: false as unknown as string,
        },
      }),
    );

    expect(values.placeholder).toBe('');
    expect(values.help_text).toBe('');
    expect(values.options).toEqual([]);
    expect(values.val_pattern).toBe('');
    expect(values.val_min_date).toBe('');
    expect(values.val_max_date).toBe('');
  });

  it('maps option toggle fields with explicit and default toggle values', () => {
    const values = fieldToFormValues(
      makeAdminField({
        options: [
          {
            label: 'Meal A',
            value: 'meal_a',
            toggle_label: 'Enable Meal A',
            toggle_default: true,
          },
          {
            label: 'Meal B',
            value: 'meal_b',
          },
        ],
      }),
    );

    expect(values.options).toEqual([
      {
        label: 'Meal A',
        value: 'meal_a',
        toggle_label: 'Enable Meal A',
        toggle_default: true,
      },
      {
        label: 'Meal B',
        value: 'meal_b',
        toggle_label: '',
      },
    ]);
  });

  it('normalizes dynamic answer payloads into preview records', () => {
    const fields = [
      makePublicField({ id: 'f1', field_key: 'team_name', field_type: 'text' }),
      makePublicField({ id: 'f2', field_key: 'accept_terms', field_type: 'checkbox' }),
    ];

    const preview = normalizeDynamicFieldAnswersForPreview(fields, {
      team_name: 'Falcons',
      accept_terms: true,
      unrelated: 'ignored',
    });

    expect(preview).toEqual([
      {
        event_field_id: 'f1',
        field_key: 'team_name',
        field_type: 'text',
        value: 'Falcons',
      },
      {
        event_field_id: 'f2',
        field_key: 'accept_terms',
        field_type: 'checkbox',
        value: true,
      },
    ]);
  });

  it('creates dynamic defaults by field type', () => {
    const defaults = createDynamicFieldDefaultValues([
      makePublicField({ field_key: 'accept_terms', field_type: 'checkbox' }),
      makePublicField({ field_key: 'is_active', field_type: 'boolean' }),
      makePublicField({ field_key: 'positions', field_type: 'multi_select' }),
      makePublicField({ field_key: 'meal_slots', field_type: 'multi_select_toggle' }),
      makePublicField({ field_key: 'nickname', field_type: 'text' }),
    ]);

    expect(defaults).toEqual({
      accept_terms: false,
      is_active: false,
      positions: [],
      meal_slots: {},
      nickname: '',
    });
  });
});
