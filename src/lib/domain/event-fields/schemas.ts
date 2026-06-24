import { z } from 'zod'
import type { PublicEventField } from './types'

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

function coerceOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

function buildStringSchema(field: PublicEventField): z.ZodType<string | undefined> {
  const rules = field.validation_rules

  let schema = z.string({ message: `${field.label} is required.` }).trim()

  if (rules.min_length !== undefined) {
    schema = schema.min(
      rules.min_length,
      `${field.label} must be at least ${rules.min_length} characters.`,
    )
  }

  if (rules.max_length !== undefined) {
    schema = schema.max(
      rules.max_length,
      `${field.label} must be at most ${rules.max_length} characters.`,
    )
  }

  if (rules.pattern) {
    try {
      const regex = new RegExp(rules.pattern)
      schema = schema.regex(regex, `${field.label} format is invalid.`)
    } catch {
      // Ignore invalid patterns from metadata and rely on basic schema checks.
    }
  }

  if (field.is_required) {
    return schema.min(1, `${field.label} is required.`)
  }

  return z.preprocess(coerceOptionalString, schema.optional()) as z.ZodType<string | undefined>
}

function buildNumberSchema(field: PublicEventField): z.ZodType<number | undefined> {
  const rules = field.validation_rules

  let schema = z.number({ message: `${field.label} must be a number.` }).finite()

  if (rules.min !== undefined) {
    schema = schema.min(rules.min, `${field.label} must be at least ${rules.min}.`)
  }

  if (rules.max !== undefined) {
    schema = schema.max(rules.max, `${field.label} must be at most ${rules.max}.`)
  }

  const preprocessed = z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === '') {
        return undefined
      }

      if (typeof value === 'number') {
        return value
      }

      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isNaN(parsed) ? value : parsed
      }

      return value
    },
    field.is_required ? schema : schema.optional(),
  )

  return preprocessed as z.ZodType<number | undefined>
}

function buildSingleChoiceSchema(field: PublicEventField): z.ZodType<string | undefined> {
  const allowedValues = new Set(field.options.map((option) => option.value))

  const schema = z
    .string({ message: `${field.label} is required.` })
    .min(1, `${field.label} is required.`)
    .refine((value) => allowedValues.has(value), `${field.label} contains an unsupported option.`)

  if (field.is_required) {
    return schema
  }

  return z.preprocess(coerceOptionalString, schema.optional()) as z.ZodType<string | undefined>
}

function buildMultiSelectSchema(field: PublicEventField): z.ZodType<string[] | undefined> {
  const rules = field.validation_rules
  const allowedValues = new Set(field.options.map((option) => option.value))

  let schema = z
    .array(z.string())
    .refine(
      (values) => values.every((value) => allowedValues.has(value)),
      `${field.label} contains an unsupported option.`,
    )

  if (field.is_required) {
    schema = schema.min(1, `${field.label} is required.`)
  }

  if (rules.min_selections !== undefined) {
    schema = schema.min(
      rules.min_selections,
      `${field.label} requires at least ${rules.min_selections} selection(s).`,
    )
  }

  if (rules.max_selections !== undefined) {
    schema = schema.max(
      rules.max_selections,
      `${field.label} allows at most ${rules.max_selections} selection(s).`,
    )
  }

  const preprocessed = z.preprocess((value) => {
    if (value === null || value === undefined || value === '') {
      return []
    }

    if (Array.isArray(value)) {
      return value
    }

    return [String(value)]
  }, schema)

  return field.is_required
    ? (preprocessed as z.ZodType<string[] | undefined>)
    : (z.preprocess(
        (value) => {
          if (Array.isArray(value) && value.length === 0) {
            return undefined
          }

          return value
        },
        z
          .preprocess((inner) => {
            if (inner === null || inner === undefined || inner === '') {
              return []
            }

            if (Array.isArray(inner)) {
              return inner
            }

            return [String(inner)]
          }, schema)
          .optional(),
      ) as z.ZodType<string[] | undefined>)
}

function buildDateLikeSchema(field: PublicEventField): z.ZodType<string | undefined> {
  const rules = field.validation_rules
  const isDateOnly = field.field_type === 'date'

  let schema = z
    .string({ message: `${field.label} is required.` })
    .min(1, `${field.label} is required.`)
    .refine(
      (value) => {
        if (isDateOnly) {
          return /^\d{4}-\d{2}-\d{2}$/.test(value)
        }

        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
      },
      `${field.label} must use a valid ${isDateOnly ? 'date' : 'date and time'} format.`,
    )

  if (rules.min_date) {
    schema = schema.refine((value) => {
      if (isDateOnly) {
        return value >= rules.min_date!
      }
      return new Date(value).getTime() >= new Date(rules.min_date!).getTime()
    }, `${field.label} must be on or after ${rules.min_date}.`)
  }

  if (rules.max_date) {
    schema = schema.refine((value) => {
      if (isDateOnly) {
        return value <= rules.max_date!
      }
      return new Date(value).getTime() <= new Date(rules.max_date!).getTime()
    }, `${field.label} must be on or before ${rules.max_date}.`)
  }

  if (field.is_required) {
    return schema
  }

  return z.preprocess(coerceOptionalString, schema.optional()) as z.ZodType<string | undefined>
}

function buildBooleanSchema(field: PublicEventField): z.ZodType<boolean | undefined> {
  if (field.is_required) {
    return z.literal(true, {
      message: `${field.label} must be accepted.`,
    }) as unknown as z.ZodType<boolean | undefined>
  }

  return z.boolean().optional() as z.ZodType<boolean | undefined>
}

function buildSchemaForField(field: PublicEventField): z.ZodType<unknown> {
  if (field.field_type === 'number') {
    return buildNumberSchema(field)
  }

  if (field.field_type === 'email') {
    let schema = z.string().trim().email(`${field.label} must be a valid email address.`)
    if (field.is_required) {
      schema = schema.min(1, `${field.label} is required.`)
      return schema
    }

    return z.preprocess(coerceOptionalString, schema.optional())
  }

  if (field.field_type === 'phone') {
    let schema = buildStringSchema(field)

    const phonePattern = /^[+0-9()\s-]{7,20}$/
    schema = schema.refine(
      (value) => value === undefined || phonePattern.test(value),
      `${field.label} must be a valid phone number.`,
    ) as z.ZodType<string | undefined>

    return schema
  }

  if (field.field_type === 'select' || field.field_type === 'radio') {
    return buildSingleChoiceSchema(field)
  }

  if (field.field_type === 'multi_select') {
    return buildMultiSelectSchema(field)
  }

  if (field.field_type === 'date' || field.field_type === 'datetime') {
    return buildDateLikeSchema(field)
  }

  if (field.field_type === 'checkbox' || field.field_type === 'boolean') {
    return buildBooleanSchema(field)
  }

  return buildStringSchema(field)
}

export function buildDynamicFieldResponseSchema(
  fields: PublicEventField[],
): z.ZodObject<Record<string, z.ZodType<unknown>>> {
  const shape: Record<string, z.ZodType<unknown>> = {}

  fields.forEach((field) => {
    shape[field.field_key] = buildSchemaForField(field)
  })

  return z.object(shape)
}
