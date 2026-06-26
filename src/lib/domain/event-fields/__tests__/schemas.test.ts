import { describe, expect, it } from 'vitest'
import {
  createEventFieldSchema,
  eventFieldFormSchema,
  reorderEventFieldsSchema,
  updateEventFieldSchema,
} from '@/lib/domain/event-fields'

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
})
