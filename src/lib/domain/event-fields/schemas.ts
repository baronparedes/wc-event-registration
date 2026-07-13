import { z } from 'zod';

import { VALIDATION_PATTERNS } from '@/config/constants';

import type { PublicEventField } from './types';

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
  'multi_select_toggle',
  'date',
  'datetime',
  'boolean',
] as const;

export type EventFieldTypeEnum = (typeof FIELD_TYPES)[number];

const fieldOptionSchema = z.object({
  label: z.string().min(1, 'Option label is required'),
  value: z.string().min(1, 'Option value is required'),
  toggle_label: z.string().optional(),
  toggle_default: z.boolean().optional(),
});

export type FieldOption = z.infer<typeof fieldOptionSchema>;

export const createEventFieldSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  field_key: z
    .string()
    .min(1, 'Field name is required')
    .max(100, 'Field name must be 100 characters or less')
    .regex(
      VALIDATION_PATTERNS.fieldKey,
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
});

export type CreateEventFieldInput = z.infer<typeof createEventFieldSchema>;

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
});

export type UpdateEventFieldInput = z.infer<typeof updateEventFieldSchema>;

export const reorderEventFieldsSchema = z.object({
  event_id: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1, 'At least one field ID is required'),
});

export type ReorderEventFieldsInput = z.infer<typeof reorderEventFieldsSchema>;

export const eventFieldFormSchema = z
  .object({
    field_key: z
      .string()
      .min(1, 'Field name is required')
      .max(100, 'Maximum 100 characters')
      .regex(
        VALIDATION_PATTERNS.fieldKey,
        'Use only lowercase letters, numbers, and underscores (e.g., team_name)',
      ),
    label: z.string().min(1, 'Field label is required').max(200, 'Maximum 200 characters'),
    field_type: z.enum(FIELD_TYPES, { error: 'Please select a field type' }),
    is_required: z.boolean(),
    is_active: z.boolean(),
    placeholder: z.string().max(200, 'Maximum 200 characters').nullable(),
    help_text: z.string().max(500, 'Maximum 500 characters').nullable(),
    options: z.array(
      z.object({
        label: z.string().min(1, 'Option label is required'),
        value: z.string().min(1, 'Option value is required'),
        toggle_label: z.string(),
        toggle_default: z.boolean().optional(),
        max_slots: z.string(),
        role_allotments: z.array(
          z.object({
            role: z.string(),
            alloted_slots: z.string(),
          }),
        ),
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
    val_max_past_days: z.string(),
    val_allowed_weekdays: z.array(z.enum(['0', '1', '2', '3', '4', '5', '6'])).optional(),
    val_unique_key_component: z.boolean().default(false),
  })
  .superRefine((values, context) => {
    if (
      (values.field_type === 'date' || values.field_type === 'datetime') &&
      values.val_max_past_days !== ''
    ) {
      const parsedMaxPastDays = Number.parseInt(values.val_max_past_days.trim(), 10);
      if (!Number.isInteger(parsedMaxPastDays) || parsedMaxPastDays < 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Max Days In The Past must be a whole number greater than or equal to 0.',
          path: ['val_max_past_days'],
        });
      }
    }

    if (values.val_unique_key_component && !values.is_required) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fields used in duplicate matching must be required.',
        path: ['val_unique_key_component'],
      });
    }

    const hasOptionCapacity =
      values.field_type === 'select' ||
      values.field_type === 'radio' ||
      values.field_type === 'multi_select' ||
      values.field_type === 'multi_select_toggle';

    if (hasOptionCapacity) {
      values.options.forEach((option, index) => {
        option.role_allotments.forEach((allotment, allotmentIndex) => {
          const parsedSlots = Number(allotment.alloted_slots.trim());
          if (!Number.isInteger(parsedSlots) || parsedSlots <= 0) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Allotted slots must be a whole number greater than 0.',
              path: ['options', index, 'role_allotments', allotmentIndex, 'alloted_slots'],
            });
          }
        });

        const normalizedRoles = option.role_allotments
          .map((allotment) => allotment.role.trim().toLowerCase())
          .filter((role) => role.length > 0);

        const hasWildcardRole = normalizedRoles.includes('*');
        const hasNonWildcardRoles = normalizedRoles.some((role) => role !== '*');

        if (hasWildcardRole && hasNonWildcardRoles) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Wildcard role (*) is universal. Remove other role allotments for this option.',
            path: ['options', index, 'role_allotments'],
          });
        }
      });
    }

    if (values.field_type !== 'multi_select_toggle') {
      return;
    }

    values.options.forEach((option, index) => {
      if (option.toggle_label.trim().length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Toggle label is required',
          path: ['options', index, 'toggle_label'],
        });
      }
    });
  });

export type EventFieldFormValues = z.input<typeof eventFieldFormSchema>;

function coerceOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function parseLocalDateFromYyyyMmDd(value: string): Date | null {
  const [yearString, monthString, dayString] = value.slice(0, 10).split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function getStartOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function buildStringSchema(field: PublicEventField): z.ZodType<string | undefined> {
  const rules = field.validation_rules;

  let schema = z.string({ message: `${field.label} is required.` }).trim();

  if (rules.min_length !== undefined) {
    schema = schema.min(
      rules.min_length,
      `${field.label} must be at least ${rules.min_length} characters.`,
    );
  }

  if (rules.max_length !== undefined) {
    schema = schema.max(
      rules.max_length,
      `${field.label} must be at most ${rules.max_length} characters.`,
    );
  }

  if (rules.pattern) {
    try {
      const regex = new RegExp(rules.pattern);
      schema = schema.regex(regex, `${field.label} format is invalid.`);
    } catch {
      // Ignore invalid patterns from metadata and rely on basic schema checks.
    }
  }

  if (field.is_required) {
    return schema.min(1, `${field.label} is required.`);
  }

  return z.preprocess(coerceOptionalString, schema.optional()) as z.ZodType<string | undefined>;
}

function buildNumberSchema(field: PublicEventField): z.ZodType<number | undefined> {
  const rules = field.validation_rules;

  let schema = z.number({ message: `${field.label} must be a number.` }).finite();

  if (rules.min !== undefined) {
    schema = schema.min(rules.min, `${field.label} must be at least ${rules.min}.`);
  }

  if (rules.max !== undefined) {
    schema = schema.max(rules.max, `${field.label} must be at most ${rules.max}.`);
  }

  const preprocessed = z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === '') {
        return undefined;
      }

      if (typeof value === 'number') {
        return value;
      }

      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? value : parsed;
      }

      return value;
    },
    field.is_required ? schema : schema.optional(),
  );

  return preprocessed as z.ZodType<number | undefined>;
}

function buildSingleChoiceSchema(field: PublicEventField): z.ZodType<string | undefined> {
  const allowedValues = new Set(field.options.map((option) => option.value));

  const schema = z
    .string({ message: `${field.label} is required.` })
    .min(1, `${field.label} is required.`)
    .refine((value) => allowedValues.has(value), `${field.label} contains an unsupported option.`);

  if (field.is_required) {
    return schema;
  }

  return z.preprocess(coerceOptionalString, schema.optional()) as z.ZodType<string | undefined>;
}

function buildMultiSelectSchema(field: PublicEventField): z.ZodType<string[] | undefined> {
  const rules = field.validation_rules;
  const allowedValues = new Set(field.options.map((option) => option.value));

  let schema = z
    .array(z.string())
    .refine(
      (values) => values.every((value) => allowedValues.has(value)),
      `${field.label} contains an unsupported option.`,
    );

  if (field.is_required) {
    schema = schema.min(1, `${field.label} is required.`);
  }

  if (rules.min_selections !== undefined) {
    schema = schema.min(
      rules.min_selections,
      `${field.label} requires at least ${rules.min_selections} selection(s).`,
    );
  }

  if (rules.max_selections !== undefined) {
    schema = schema.max(
      rules.max_selections,
      `${field.label} allows at most ${rules.max_selections} selection(s).`,
    );
  }

  const preprocessed = z.preprocess((value) => {
    if (value === null || value === undefined || value === '') {
      return [];
    }

    if (Array.isArray(value)) {
      return value;
    }

    return [String(value)];
  }, schema);

  return field.is_required
    ? (preprocessed as z.ZodType<string[] | undefined>)
    : (z.preprocess(
        (value) => {
          if (Array.isArray(value) && value.length === 0) {
            return undefined;
          }

          return value;
        },
        z
          .preprocess((inner) => {
            if (inner === null || inner === undefined || inner === '') {
              return [];
            }

            if (Array.isArray(inner)) {
              return inner;
            }

            return [String(inner)];
          }, schema)
          .optional(),
      ) as z.ZodType<string[] | undefined>);
}

function buildMultiSelectToggleSchema(
  field: PublicEventField,
): z.ZodType<Record<string, boolean> | undefined> {
  const rules = field.validation_rules;
  const allowedValues = new Set(field.options.map((option) => option.value));
  const toggleDefaultsByValue = new Map(
    field.options.map((option) => [option.value, option.toggle_default]),
  );

  let schema = z
    .record(z.string(), z.union([z.boolean(), z.null()]))
    .refine(
      (values) => Object.keys(values).every((key) => allowedValues.has(key)),
      `${field.label} contains an unsupported option.`,
    )
    .refine(
      (values) =>
        Object.entries(values).every(([key, value]) => {
          if (value !== null) {
            return true;
          }

          return toggleDefaultsByValue.get(key) !== undefined;
        }),
      `${field.label} requires a Yes/No choice for each selected option without a default.`,
    );

  if (field.is_required) {
    schema = schema.refine(
      (values) => Object.keys(values).length > 0,
      `${field.label} is required.`,
    );
  }

  if (rules.min_selections !== undefined) {
    schema = schema.refine(
      (values) => Object.keys(values).length >= rules.min_selections!,
      `${field.label} requires at least ${rules.min_selections} selection(s).`,
    );
  }

  if (rules.max_selections !== undefined) {
    schema = schema.refine(
      (values) => Object.keys(values).length <= rules.max_selections!,
      `${field.label} allows at most ${rules.max_selections} selection(s).`,
    );
  }

  return z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === '') {
        return {};
      }

      if (typeof value !== 'object' || Array.isArray(value)) {
        return value;
      }

      return value;
    },
    schema.transform(
      (values) =>
        Object.fromEntries(
          Object.entries(values).map(([key, value]) => [
            key,
            value ?? toggleDefaultsByValue.get(key),
          ]),
        ) as Record<string, boolean>,
    ),
  ) as z.ZodType<Record<string, boolean> | undefined>;
}

function buildDateLikeSchema(field: PublicEventField): z.ZodType<string | undefined> {
  const rules = field.validation_rules;
  const isDateOnly = field.field_type === 'date';
  const allowedWeekdays = Array.isArray(rules.allowed_weekdays)
    ? rules.allowed_weekdays
        .filter(
          (weekday): weekday is number => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6,
        )
        .filter((weekday, index, values) => values.indexOf(weekday) === index)
    : [];

  let schema = z
    .string({ message: `${field.label} is required.` })
    .min(1, `${field.label} is required.`)
    .refine(
      (value) => {
        if (isDateOnly) {
          return VALIDATION_PATTERNS.dateYyyyMmDd.test(value);
        }

        return VALIDATION_PATTERNS.datetimeYyyyMmDdThhMm.test(value);
      },
      `${field.label} must use a valid ${isDateOnly ? 'date' : 'date and time'} format.`,
    );

  if (rules.min_date) {
    schema = schema.refine((value) => {
      if (isDateOnly) {
        return value >= rules.min_date!;
      }
      return new Date(value).getTime() >= new Date(rules.min_date!).getTime();
    }, `${field.label} must be on or after ${rules.min_date}.`);
  }

  if (rules.max_date) {
    schema = schema.refine((value) => {
      if (isDateOnly) {
        return value <= rules.max_date!;
      }
      return new Date(value).getTime() <= new Date(rules.max_date!).getTime();
    }, `${field.label} must be on or before ${rules.max_date}.`);
  }

  if (typeof rules.max_past_days === 'number' && Number.isInteger(rules.max_past_days)) {
    schema = schema.refine((value) => {
      const oldestAllowedDate = getStartOfLocalDay(new Date());
      oldestAllowedDate.setDate(oldestAllowedDate.getDate() - rules.max_past_days!);

      if (isDateOnly) {
        const selectedDate = parseLocalDateFromYyyyMmDd(value);
        if (!selectedDate) {
          return false;
        }

        return selectedDate.getTime() >= oldestAllowedDate.getTime();
      }

      const selectedDate = parseLocalDateFromYyyyMmDd(value);
      if (!selectedDate) {
        return false;
      }

      return selectedDate.getTime() >= oldestAllowedDate.getTime();
    }, `${field.label} cannot be more than ${rules.max_past_days} day(s) in the past.`);
  }

  if (allowedWeekdays.length > 0) {
    const weekdayLabels = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const allowedLabels = allowedWeekdays.map((weekday) => weekdayLabels[weekday]).join(', ');

    schema = schema.refine((value) => {
      const dateValue = value.slice(0, 10);
      const [yearString, monthString, dayString] = dateValue.split('-');
      const year = Number(yearString);
      const month = Number(monthString);
      const day = Number(dayString);

      if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return false;
      }

      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      return allowedWeekdays.includes(weekday);
    }, `${field.label} must fall on: ${allowedLabels}.`);
  }

  if (field.is_required) {
    return schema;
  }

  return z.preprocess(coerceOptionalString, schema.optional()) as z.ZodType<string | undefined>;
}

function buildBooleanSchema(field: PublicEventField): z.ZodType<boolean | undefined> {
  if (field.is_required) {
    return z.literal(true, {
      message: `${field.label} must be accepted.`,
    }) as unknown as z.ZodType<boolean | undefined>;
  }

  return z.boolean().optional() as z.ZodType<boolean | undefined>;
}

function buildSchemaForField(field: PublicEventField): z.ZodType<unknown> {
  if (field.field_type === 'number') {
    return buildNumberSchema(field);
  }

  if (field.field_type === 'email') {
    let schema = z.string().trim().email(`${field.label} must be a valid email address.`);
    if (field.is_required) {
      schema = schema.min(1, `${field.label} is required.`);
      return schema;
    }

    return z.preprocess(coerceOptionalString, schema.optional());
  }

  if (field.field_type === 'phone') {
    let schema = buildStringSchema(field);

    const phonePattern = VALIDATION_PATTERNS.phone;
    schema = schema.refine(
      (value) => value === undefined || phonePattern.test(value),
      `${field.label} must be a valid phone number.`,
    ) as z.ZodType<string | undefined>;

    return schema;
  }

  if (field.field_type === 'select' || field.field_type === 'radio') {
    return buildSingleChoiceSchema(field);
  }

  if (field.field_type === 'multi_select') {
    return buildMultiSelectSchema(field);
  }

  if (field.field_type === 'multi_select_toggle') {
    return buildMultiSelectToggleSchema(field);
  }

  if (field.field_type === 'date' || field.field_type === 'datetime') {
    return buildDateLikeSchema(field);
  }

  if (field.field_type === 'checkbox' || field.field_type === 'boolean') {
    return buildBooleanSchema(field);
  }

  return buildStringSchema(field);
}

export function buildDynamicFieldResponseSchema(
  fields: PublicEventField[],
): z.ZodObject<Record<string, z.ZodType<unknown>>> {
  const shape: Record<string, z.ZodType<unknown>> = {};

  fields.forEach((field) => {
    shape[field.field_key] = buildSchemaForField(field);
  });

  return z.object(shape);
}
