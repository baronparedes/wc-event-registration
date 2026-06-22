import { z } from 'zod'
import type {
  EventFieldConfigValidationResult,
  PublicEventField,
  PublicEventFieldOption,
  PublicEventFieldRow,
  PublicEventFieldValidationRules,
} from './types'

const eventFieldTypeSchema = z.enum([
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
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseFieldOptions(field: PublicEventFieldRow): {
  options: PublicEventFieldOption[]
  issue: string | null
} {
  const requiresOptions =
    field.field_type === 'select' ||
    field.field_type === 'radio' ||
    field.field_type === 'multi_select'

  if (!Array.isArray(field.options)) {
    return {
      options: [],
      issue: requiresOptions ? `Field "${field.field_key}" must define options as an array.` : null,
    }
  }

  const normalized = field.options
    .map((entry) => {
      if (typeof entry === 'string') {
        const value = entry.trim()
        if (!value) {
          return null
        }
        return { label: value, value }
      }

      if (!isRecord(entry)) {
        return null
      }

      const rawLabel = typeof entry.label === 'string' ? entry.label.trim() : ''
      const rawValue = typeof entry.value === 'string' ? entry.value.trim() : ''

      const value = rawValue || rawLabel
      const label = rawLabel || rawValue

      if (!label || !value) {
        return null
      }

      return { label, value }
    })
    .filter((entry): entry is PublicEventFieldOption => Boolean(entry))

  const deduped = normalized.filter(
    (option, index) =>
      normalized.findIndex((candidate) => candidate.value === option.value) === index,
  )

  if (requiresOptions && deduped.length === 0) {
    return {
      options: [],
      issue: `Field "${field.field_key}" must include at least one valid option.`,
    }
  }

  return { options: deduped, issue: null }
}

function parseFieldValidationRules(field: PublicEventFieldRow): PublicEventFieldValidationRules {
  if (!isRecord(field.validation_rules)) {
    return {}
  }

  const rules: PublicEventFieldValidationRules = {}

  const minLength = field.validation_rules.min_length
  if (typeof minLength === 'number' && Number.isFinite(minLength) && minLength >= 0) {
    rules.min_length = minLength
  }

  const maxLength = field.validation_rules.max_length
  if (typeof maxLength === 'number' && Number.isFinite(maxLength) && maxLength >= 0) {
    rules.max_length = maxLength
  }

  const pattern = field.validation_rules.pattern
  if (typeof pattern === 'string' && pattern.trim().length > 0) {
    rules.pattern = pattern
  }

  const min = field.validation_rules.min
  if (typeof min === 'number' && Number.isFinite(min)) {
    rules.min = min
  }

  const max = field.validation_rules.max
  if (typeof max === 'number' && Number.isFinite(max)) {
    rules.max = max
  }

  const minSelections = field.validation_rules.min_selections
  if (
    typeof minSelections === 'number' &&
    Number.isFinite(minSelections) &&
    Number.isInteger(minSelections) &&
    minSelections >= 0
  ) {
    rules.min_selections = minSelections
  }

  const maxSelections = field.validation_rules.max_selections
  if (
    typeof maxSelections === 'number' &&
    Number.isFinite(maxSelections) &&
    Number.isInteger(maxSelections) &&
    maxSelections >= 0
  ) {
    rules.max_selections = maxSelections
  }

  const minDate = field.validation_rules.min_date
  if (typeof minDate === 'string' && minDate.trim().length > 0) {
    rules.min_date = minDate
  }

  const maxDate = field.validation_rules.max_date
  if (typeof maxDate === 'string' && maxDate.trim().length > 0) {
    rules.max_date = maxDate
  }

  return rules
}

export function validatePublicEventFieldConfig(
  rows: PublicEventFieldRow[],
): EventFieldConfigValidationResult {
  const issues: string[] = []
  const validFields: PublicEventField[] = []

  rows.forEach((row) => {
    const parsedType = eventFieldTypeSchema.safeParse(row.field_type)
    if (!parsedType.success) {
      issues.push(`Field "${row.field_key}" has unsupported type "${String(row.field_type)}".`)
      return
    }

    const parsedOptions = parseFieldOptions({ ...row, field_type: parsedType.data })
    if (parsedOptions.issue) {
      issues.push(parsedOptions.issue)
      return
    }

    validFields.push({
      ...row,
      field_type: parsedType.data,
      options: parsedOptions.options,
      validation_rules: parseFieldValidationRules(row),
    })
  })

  return { validFields, issues }
}
