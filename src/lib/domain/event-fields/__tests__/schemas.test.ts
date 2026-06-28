import { describe, expect, it } from 'vitest'
import {
  buildDynamicFieldResponseSchema,
  createEventFieldSchema,
  eventFieldFormSchema,
  reorderEventFieldsSchema,
  updateEventFieldSchema,
} from '@/lib/domain/event-fields'
import type { PublicEventField } from '@/lib/domain/event-fields'

const EVENT_ID = '9a693702-90e6-499f-8835-8f57ef1ea8d7'

function createField(overrides: Partial<PublicEventField>): PublicEventField {
  return {
    id: 'c9707ebf-a95d-4f42-ba04-bde679f92ed8',
    event_id: EVENT_ID,
    field_key: 'field_key',
    label: 'Field Label',
    field_type: 'text',
    is_required: true,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 0,
    ...overrides,
  }
}

describe('event-fields schemas', () => {
  it('accepts valid create event field input', () => {
    const parsed = createEventFieldSchema.parse({
      event_id: '9a693702-90e6-499f-8835-8f57ef1ea8d7',
      field_key: 'team_name',
      label: 'Team Name',
      field_type: 'text',
      is_required: true,
      is_active: true,
      placeholder: 'Enter team name',
      help_text: 'Use your official team name',
      options: [],
      validation_rules: { min_length: 2 },
      display_order: 0,
    })

    expect(parsed.field_key).toBe('team_name')
    expect(parsed.validation_rules).toEqual({ min_length: 2 })
  })

  it('rejects create input with invalid field_key format', () => {
    const parsed = createEventFieldSchema.safeParse({
      event_id: '9a693702-90e6-499f-8835-8f57ef1ea8d7',
      field_key: 'Team Name',
      label: 'Team Name',
      field_type: 'text',
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects create input with invalid field_type value', () => {
    const parsed = createEventFieldSchema.safeParse({
      event_id: '9a693702-90e6-499f-8835-8f57ef1ea8d7',
      field_key: 'team_name',
      label: 'Team Name',
      field_type: 'unknown_type',
    })

    expect(parsed.success).toBe(false)
  })

  it('accepts valid event field form values', () => {
    const parsed = eventFieldFormSchema.parse({
      field_key: 'jersey_number',
      label: 'Jersey Number',
      field_type: 'number',
      is_required: true,
      is_active: true,
      placeholder: null,
      help_text: null,
      options: [],
      val_min_length: '',
      val_max_length: '',
      val_pattern: '',
      val_min: '1',
      val_max: '99',
      val_min_selections: '',
      val_max_selections: '',
      val_min_date: '',
      val_max_date: '',
    })

    expect(parsed.field_type).toBe('number')
  })

  it('rejects event field form values with missing label', () => {
    const parsed = eventFieldFormSchema.safeParse({
      field_key: 'jersey_number',
      label: '',
      field_type: 'number',
      is_required: true,
      is_active: true,
      placeholder: null,
      help_text: null,
      options: [],
      val_min_length: '',
      val_max_length: '',
      val_pattern: '',
      val_min: '',
      val_max: '',
      val_min_selections: '',
      val_max_selections: '',
      val_min_date: '',
      val_max_date: '',
    })

    expect(parsed.success).toBe(false)
  })

  it('requires a toggle label for each multi_select_toggle option', () => {
    const parsed = eventFieldFormSchema.safeParse({
      field_key: 'meal_windows',
      label: 'Meal Windows',
      field_type: 'multi_select_toggle',
      is_required: true,
      is_active: true,
      placeholder: null,
      help_text: null,
      options: [
        {
          label: '9AM',
          value: '9am',
          toggle_label: '',
          toggle_default: false,
        },
      ],
      val_min_length: '',
      val_max_length: '',
      val_pattern: '',
      val_min: '',
      val_max: '',
      val_min_selections: '',
      val_max_selections: '',
      val_min_date: '',
      val_max_date: '',
    })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['options', 0, 'toggle_label'])
    }
  })

  it('accepts valid update event field input', () => {
    const parsed = updateEventFieldSchema.parse({
      id: 'c9707ebf-a95d-4f42-ba04-bde679f92ed8',
      event_id: '9a693702-90e6-499f-8835-8f57ef1ea8d7',
      label: 'Updated Label',
      is_required: false,
    })

    expect(parsed.label).toBe('Updated Label')
  })

  it('requires at least one id in reorder payload', () => {
    const parsed = reorderEventFieldsSchema.safeParse({
      event_id: '9a693702-90e6-499f-8835-8f57ef1ea8d7',
      orderedIds: [],
    })

    expect(parsed.success).toBe(false)
  })

  it('parses optional text fields as undefined when blank and enforces required text constraints', () => {
    const requiredTextSchema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'team_name',
        label: 'Team Name',
        field_type: 'text',
        is_required: true,
        validation_rules: { min_length: 2, max_length: 10, pattern: '^[A-Za-z ]+$' },
      }),
    ])

    expect(requiredTextSchema.safeParse({ team_name: 'Alpha' }).success).toBe(true)
    expect(requiredTextSchema.safeParse({ team_name: 'A' }).success).toBe(false)
    expect(requiredTextSchema.safeParse({ team_name: '123' }).success).toBe(false)

    const optionalTextSchema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'nickname',
        label: 'Nickname',
        field_type: 'textarea',
        is_required: false,
      }),
    ])

    const parsed = optionalTextSchema.parse({ nickname: '   ' })
    expect(parsed.nickname).toBeUndefined()
  })

  it('ignores invalid regex metadata patterns for string fields', () => {
    const schema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'custom_text',
        label: 'Custom Text',
        field_type: 'text',
        is_required: false,
        validation_rules: { pattern: '[' },
      }),
    ])

    const parsed = schema.safeParse({ custom_text: 'keeps-working' })
    expect(parsed.success).toBe(true)
  })

  it('coerces numbers and validates min/max constraints', () => {
    const requiredNumberSchema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'jersey_number',
        label: 'Jersey Number',
        field_type: 'number',
        is_required: true,
        validation_rules: { min: 1, max: 99 },
      }),
    ])

    expect(requiredNumberSchema.parse({ jersey_number: '42' }).jersey_number).toBe(42)
    expect(requiredNumberSchema.safeParse({ jersey_number: '0' }).success).toBe(false)
    expect(requiredNumberSchema.safeParse({ jersey_number: '100' }).success).toBe(false)
    expect(requiredNumberSchema.safeParse({ jersey_number: 'abc' }).success).toBe(false)

    const optionalNumberSchema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'favorite_number',
        label: 'Favorite Number',
        field_type: 'number',
        is_required: false,
      }),
    ])

    expect(optionalNumberSchema.parse({ favorite_number: '' }).favorite_number).toBeUndefined()
  })

  it('validates email fields for required and optional behavior', () => {
    const requiredEmailSchema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'email',
        label: 'Email',
        field_type: 'email',
        is_required: true,
      }),
    ])

    expect(requiredEmailSchema.safeParse({ email: 'user@example.com' }).success).toBe(true)
    expect(requiredEmailSchema.safeParse({ email: '' }).success).toBe(false)
    expect(requiredEmailSchema.safeParse({ email: 'invalid' }).success).toBe(false)

    const optionalEmailSchema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'secondary_email',
        label: 'Secondary Email',
        field_type: 'email',
        is_required: false,
      }),
    ])

    expect(optionalEmailSchema.parse({ secondary_email: '   ' }).secondary_email).toBeUndefined()
  })

  it('validates phone format while allowing optional blanks', () => {
    const requiredPhoneSchema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'phone',
        label: 'Phone',
        field_type: 'phone',
        is_required: true,
      }),
    ])

    expect(requiredPhoneSchema.safeParse({ phone: '+1 (555) 555-0100' }).success).toBe(true)
    expect(requiredPhoneSchema.safeParse({ phone: 'abc' }).success).toBe(false)

    const optionalPhoneSchema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'backup_phone',
        label: 'Backup Phone',
        field_type: 'phone',
        is_required: false,
      }),
    ])

    expect(optionalPhoneSchema.parse({ backup_phone: '' }).backup_phone).toBeUndefined()
  })

  it('validates select and radio values against allowed options', () => {
    const selectSchema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'shirt_size',
        label: 'Shirt Size',
        field_type: 'select',
        is_required: true,
        options: [
          { label: 'Small', value: 's' },
          { label: 'Large', value: 'l' },
        ],
      }),
      createField({
        id: '42f3e8b6-95d7-4e96-b704-6fca94286d87',
        field_key: 'meal_choice',
        label: 'Meal Choice',
        field_type: 'radio',
        is_required: false,
        options: [
          { label: 'Veg', value: 'veg' },
          { label: 'Meat', value: 'meat' },
        ],
      }),
    ])

    expect(selectSchema.safeParse({ shirt_size: 's', meal_choice: 'veg' }).success).toBe(true)
    expect(selectSchema.safeParse({ shirt_size: 'xl', meal_choice: 'veg' }).success).toBe(false)

    const parsed = selectSchema.parse({ shirt_size: 'l', meal_choice: '' })
    expect(parsed.meal_choice).toBeUndefined()
  })

  it('validates multiselect fields including normalization and min/max selection rules', () => {
    const requiredMultiSelectSchema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'roles',
        label: 'Roles',
        field_type: 'multi_select',
        is_required: true,
        options: [
          { label: 'Player', value: 'player' },
          { label: 'Coach', value: 'coach' },
          { label: 'Manager', value: 'manager' },
        ],
        validation_rules: { min_selections: 1, max_selections: 2 },
      }),
    ])

    expect(requiredMultiSelectSchema.parse({ roles: 'player' }).roles).toEqual(['player'])
    expect(requiredMultiSelectSchema.safeParse({ roles: [] }).success).toBe(false)
    expect(requiredMultiSelectSchema.safeParse({ roles: ['invalid'] }).success).toBe(false)
    expect(
      requiredMultiSelectSchema.safeParse({ roles: ['player', 'coach', 'manager'] }).success,
    ).toBe(false)

    const optionalMultiSelectSchema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'extra_roles',
        label: 'Extra Roles',
        field_type: 'multi_select',
        is_required: false,
        options: [
          { label: 'Staff', value: 'staff' },
          { label: 'Volunteer', value: 'volunteer' },
        ],
      }),
    ])

    expect(optionalMultiSelectSchema.parse({ extra_roles: '' }).extra_roles).toEqual([])
    expect(optionalMultiSelectSchema.parse({ extra_roles: ['staff'] }).extra_roles).toEqual([
      'staff',
    ])
  })

  it('validates multi-select toggle fields with option-keyed boolean values', () => {
    const schema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'meal_windows',
        label: 'Meal Windows',
        field_type: 'multi_select_toggle',
        is_required: true,
        options: [
          { label: '9AM', value: '9am' },
          { label: '12NN', value: '12nn' },
          { label: '3PM', value: '3pm' },
        ],
        validation_rules: { min_selections: 1, max_selections: 2 },
      }),
    ])

    expect(schema.safeParse({ meal_windows: { '9am': true, '12nn': false } }).success).toBe(true)
    expect(schema.safeParse({ meal_windows: {} }).success).toBe(false)
    expect(schema.safeParse({ meal_windows: { unknown: true } }).success).toBe(false)
    expect(schema.safeParse({ meal_windows: { '9am': 'yes' } }).success).toBe(false)
    expect(
      schema.safeParse({ meal_windows: { '9am': true, '12nn': false, '3pm': true } }).success,
    ).toBe(false)
  })

  it('validates date and datetime formats with min/max boundary checks', () => {
    const dateSchema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'birth_date',
        label: 'Birth Date',
        field_type: 'date',
        is_required: true,
        validation_rules: { min_date: '2024-01-01', max_date: '2024-12-31' },
      }),
      createField({
        id: '3ae830ec-89bc-4f16-98e4-8fa1ad072010',
        field_key: 'arrival_time',
        label: 'Arrival Time',
        field_type: 'datetime',
        is_required: false,
        validation_rules: {
          min_date: '2024-01-01T08:00:00.000Z',
          max_date: '2024-01-01T18:00:00.000Z',
        },
      }),
    ])

    expect(dateSchema.safeParse({ birth_date: '2024-06-01', arrival_time: '' }).success).toBe(true)
    expect(dateSchema.safeParse({ birth_date: '06/01/2024' }).success).toBe(false)
    expect(dateSchema.safeParse({ birth_date: '2023-12-31' }).success).toBe(false)
    expect(
      dateSchema.safeParse({
        birth_date: '2024-06-01',
        arrival_time: '2024-01-01T19:00:00.000Z',
      }).success,
    ).toBe(false)
  })

  it('enforces required checkboxes/booleans and allows optional booleans', () => {
    const schema = buildDynamicFieldResponseSchema([
      createField({
        field_key: 'terms_accepted',
        label: 'Terms Accepted',
        field_type: 'checkbox',
        is_required: true,
      }),
      createField({
        id: '1e777438-0042-4ebc-b526-8e8f4b518d59',
        field_key: 'newsletter',
        label: 'Newsletter',
        field_type: 'boolean',
        is_required: false,
      }),
    ])

    expect(schema.safeParse({ terms_accepted: true, newsletter: false }).success).toBe(true)
    expect(schema.safeParse({ terms_accepted: false, newsletter: true }).success).toBe(false)
    expect(schema.parse({ terms_accepted: true }).newsletter).toBeUndefined()
  })
})
