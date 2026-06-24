import type { AdminEventField, DynamicFieldResponseValues, PublicEventField } from './types'
import type { DynamicFieldAnswerPreview } from '@/lib/domain/events'
import type { EventFieldFormValues, EventFieldTypeEnum } from './schemas'

export type { EventFieldFormValues } from './schemas'

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
  if (values.val_min_selections !== '') {
    rules.min_selections = parseInt(values.val_min_selections, 10)
  }
  if (values.val_max_selections !== '') {
    rules.max_selections = parseInt(values.val_max_selections, 10)
  }
  if (values.val_min_date !== '') rules.min_date = values.val_min_date
  if (values.val_max_date !== '') rules.max_date = values.val_max_date
  return rules
}

export function normalizeDynamicFieldAnswersForPreview(
  fields: PublicEventField[],
  values: DynamicFieldResponseValues,
): DynamicFieldAnswerPreview[] {
  return fields.map((field) => ({
    event_field_id: field.id,
    field_key: field.field_key,
    field_type: field.field_type,
    value: values[field.field_key],
  }))
}

export function createDynamicFieldDefaultValues(
  fields: PublicEventField[],
): DynamicFieldResponseValues {
  return fields.reduce<DynamicFieldResponseValues>((defaults, field) => {
    if (field.field_type === 'checkbox' || field.field_type === 'boolean') {
      defaults[field.field_key] = false
      return defaults
    }

    if (field.field_type === 'multi_select') {
      defaults[field.field_key] = []
      return defaults
    }

    defaults[field.field_key] = ''
    return defaults
  }, {})
}
