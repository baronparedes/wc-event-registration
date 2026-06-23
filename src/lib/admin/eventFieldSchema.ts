import { z } from 'zod'
import type { AdminEventField } from './types'

export const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'select',
  'radio',
  'checkbox',
  'multi_select',
  'date',
  'datetime',
  'boolean',
] as const

export type EventFieldTypeEnum = (typeof FIELD_TYPES)[number]

/** User-facing labels for each field type. */
export const FIELD_TYPE_LABELS: Record<EventFieldTypeEnum, string> = {
  text: 'Single Line Text',
  textarea: 'Multi-line Text',
  number: 'Number',
  email: 'Email Address',
  phone: 'Phone Number',
  select: 'Dropdown List',
  radio: 'Radio Buttons',
  checkbox: 'Checkbox',
  multi_select: 'Checkboxes (Multiple)',
  date: 'Date',
  datetime: 'Date & Time',
  boolean: 'Yes / No Toggle',
}

/**
 * Fields that can be updated on published events.
 * Structural changes (type, required, options, rules) are blocked.
 */
export const PUBLISHED_EDITABLE_FIELDS = ['label', 'placeholder', 'help_text'] as const
export type PublishedEditableField = (typeof PUBLISHED_EDITABLE_FIELDS)[number]

/** Whether a field type uses an options list (select/radio/multi_select). */
export function fieldTypeHasOptions(ft: EventFieldTypeEnum): boolean {
  return ft === 'select' || ft === 'radio' || ft === 'multi_select'
}

/** Whether a field type supports text-based validation rules. */
export function fieldTypeHasTextValidation(ft: EventFieldTypeEnum): boolean {
  return ft === 'text' || ft === 'textarea' || ft === 'email' || ft === 'phone'
}

/** Whether a field type supports numeric validation rules. */
export function fieldTypeHasNumberValidation(ft: EventFieldTypeEnum): boolean {
  return ft === 'number'
}

/** Whether a field type supports selection count validation. */
export function fieldTypeHasMultiSelectValidation(ft: EventFieldTypeEnum): boolean {
  return ft === 'multi_select'
}

/** Whether a field type supports date range validation. */
export function fieldTypeHasDateValidation(ft: EventFieldTypeEnum): boolean {
  return ft === 'date' || ft === 'datetime'
}

/** Whether a field type has any configurable validation rules. */
export function fieldTypeHasValidation(ft: EventFieldTypeEnum): boolean {
  return (
    fieldTypeHasTextValidation(ft) ||
    fieldTypeHasNumberValidation(ft) ||
    fieldTypeHasMultiSelectValidation(ft) ||
    fieldTypeHasDateValidation(ft)
  )
}

// ---------------------------------------------------------------------------
// API-level schemas
// ---------------------------------------------------------------------------

const fieldOptionSchema = z.object({
  label: z.string().min(1, 'Option label is required'),
  value: z.string().min(1, 'Option value is required'),
})

export type FieldOption = z.infer<typeof fieldOptionSchema>

export const createEventFieldSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  field_key: z
    .string()
    .min(1, 'Field name is required')
    .max(100, 'Field name must be 100 characters or less')
    .regex(
      /^[a-z0-9_]+$/,
      'Field name must use only lowercase letters, numbers, and underscores (e.g., team_name)',
    ),
  label: z
    .string()
    .min(1, 'Field label is required')
    .max(200, 'Field label must be 200 characters or less'),
  field_type: z.enum(FIELD_TYPES, { error: 'Please select a field type' }),
  is_required: z.boolean().default(false),
  is_active: z.boolean().default(true),
  placeholder: z
    .string()
    .max(200, 'Placeholder must be 200 characters or less')
    .nullable()
    .optional(),
  help_text: z.string().max(500, 'Help text must be 500 characters or less').nullable().optional(),
  options: z.array(fieldOptionSchema).default([]),
  validation_rules: z.record(z.string(), z.unknown()).default({}),
  display_order: z.number().int().min(0).default(0),
})

export type CreateEventFieldInput = z.infer<typeof createEventFieldSchema>

export const updateEventFieldSchema = z.object({
  id: z.string().uuid('Invalid field ID'),
  event_id: z.string().uuid('Invalid event ID'),
  label: z
    .string()
    .min(1, 'Field label is required')
    .max(200, 'Field label must be 200 characters or less')
    .optional(),
  field_type: z.enum(FIELD_TYPES).optional(),
  is_required: z.boolean().optional(),
  is_active: z.boolean().optional(),
  placeholder: z.string().max(200).nullable().optional(),
  help_text: z.string().max(500).nullable().optional(),
  options: z.array(fieldOptionSchema).optional(),
  validation_rules: z.record(z.string(), z.unknown()).optional(),
  display_order: z.number().int().min(0).optional(),
})

export type UpdateEventFieldInput = z.infer<typeof updateEventFieldSchema>

export const reorderEventFieldsSchema = z.object({
  event_id: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1, 'At least one field ID is required'),
})

export type ReorderEventFieldsInput = z.infer<typeof reorderEventFieldsSchema>

// ---------------------------------------------------------------------------
// Form schema (flat structure for React Hook Form compatibility)
// ---------------------------------------------------------------------------

export const eventFieldFormSchema = z.object({
  field_key: z
    .string()
    .min(1, 'Field name is required')
    .max(100, 'Maximum 100 characters')
    .regex(
      /^[a-z0-9_]+$/,
      'Use only lowercase letters, numbers, and underscores (e.g., team_name)',
    ),
  label: z.string().min(1, 'Field label is required').max(200, 'Maximum 200 characters'),
  field_type: z.enum(FIELD_TYPES, { error: 'Please select a field type' }),
  is_required: z.boolean(),
  is_active: z.boolean(),
  placeholder: z.string().max(200, 'Maximum 200 characters'),
  help_text: z.string().max(500, 'Maximum 500 characters'),
  options: z.array(
    z.object({
      label: z.string().min(1, 'Option label is required'),
      value: z.string().min(1, 'Option value is required'),
    }),
  ),
  // Validation rule values stored as strings for native input compatibility
  val_min_length: z.string(),
  val_max_length: z.string(),
  val_pattern: z.string(),
  val_min: z.string(),
  val_max: z.string(),
  val_min_selections: z.string(),
  val_max_selections: z.string(),
  val_min_date: z.string(),
  val_max_date: z.string(),
})

export type EventFieldFormValues = z.infer<typeof eventFieldFormSchema>

export const DEFAULT_FIELD_FORM_VALUES: EventFieldFormValues = {
  field_key: '',
  label: '',
  field_type: 'text',
  is_required: false,
  is_active: true,
  placeholder: '',
  help_text: '',
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
}

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

/** Convert a saved AdminEventField to form default values for pre-filling the edit panel. */
export function fieldToFormValues(field: AdminEventField): EventFieldFormValues {
  const rules = field.validation_rules ?? {}
  return {
    field_key: field.field_key,
    label: field.label,
    field_type: field.field_type as EventFieldTypeEnum,
    is_required: field.is_required,
    is_active: field.is_active,
    placeholder: field.placeholder ?? '',
    help_text: field.help_text ?? '',
    options: (field.options ?? []) as Array<{ label: string; value: string }>,
    val_min_length: rules.min_length != null ? String(rules.min_length) : '',
    val_max_length: rules.max_length != null ? String(rules.max_length) : '',
    val_pattern: typeof rules.pattern === 'string' ? rules.pattern : '',
    val_min: rules.min != null ? String(rules.min) : '',
    val_max: rules.max != null ? String(rules.max) : '',
    val_min_selections: rules.min_selections != null ? String(rules.min_selections) : '',
    val_max_selections: rules.max_selections != null ? String(rules.max_selections) : '',
    val_min_date: typeof rules.min_date === 'string' ? rules.min_date : '',
    val_max_date: typeof rules.max_date === 'string' ? rules.max_date : '',
  }
}

/** Convert flat form values to a typed validation_rules object. */
export function toValidationRules(values: EventFieldFormValues): Record<string, unknown> {
  const rules: Record<string, unknown> = {}
  if (values.val_min_length !== '') rules.min_length = parseInt(values.val_min_length, 10)
  if (values.val_max_length !== '') rules.max_length = parseInt(values.val_max_length, 10)
  if (values.val_pattern !== '') rules.pattern = values.val_pattern
  if (values.val_min !== '') rules.min = parseFloat(values.val_min)
  if (values.val_max !== '') rules.max = parseFloat(values.val_max)
  if (values.val_min_selections !== '')
    rules.min_selections = parseInt(values.val_min_selections, 10)
  if (values.val_max_selections !== '')
    rules.max_selections = parseInt(values.val_max_selections, 10)
  if (values.val_min_date !== '') rules.min_date = values.val_min_date
  if (values.val_max_date !== '') rules.max_date = values.val_max_date
  return rules
}
