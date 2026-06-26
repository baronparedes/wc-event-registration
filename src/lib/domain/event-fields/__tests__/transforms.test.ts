import { describe, expect, it } from 'vitest'
import {
  createDynamicFieldDefaultValues,
  fieldToFormValues,
  toValidationRules,
  type AdminEventField,
  type EventFieldFormValues,
  type PublicEventField,
} from '@/lib/domain/event-fields'

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
  }
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
  }
}

describe('event-fields transforms', () => {
  it('converts an admin field to event field form values', () => {
    const values = fieldToFormValues(makeAdminField())

    expect(values.field_key).toBe('team_name')
    expect(values.label).toBe('Team Name')
    expect(values.val_min_length).toBe('2')
    expect(values.val_max_length).toBe('50')
    expect(values.val_pattern).toBe('^[A-Za-z ]+$')
  })

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
    }

    const rules = toValidationRules(values)

    expect(rules).toEqual({
      min_length: 2,
      pattern: '^[A-Za-z ]+$',
      min: 1,
      max: 10,
    })
  })

  it('creates dynamic defaults by field type', () => {
    const defaults = createDynamicFieldDefaultValues([
      makePublicField({ field_key: 'accept_terms', field_type: 'checkbox' }),
      makePublicField({ field_key: 'is_active', field_type: 'boolean' }),
      makePublicField({ field_key: 'positions', field_type: 'multi_select' }),
      makePublicField({ field_key: 'nickname', field_type: 'text' }),
    ])

    expect(defaults).toEqual({
      accept_terms: false,
      is_active: false,
      positions: [],
      nickname: '',
    })
  })
})
