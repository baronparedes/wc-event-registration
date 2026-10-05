import { z } from 'zod';

import { VALIDATION_PATTERNS } from '@/config/constants';

import type { DynamicFieldLike, DynamicFieldOptionItem } from './types';

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

function buildStringSchema(field: DynamicFieldLike): z.ZodType<string | undefined> {
  const rules = (field.validation_rules ?? {}) as Record<string, unknown>;

  let schema = z.string({ message: `${field.label} is required.` }).trim();

  if (typeof rules.min_length === 'number') {
    schema = schema.min(
      rules.min_length,
      `${field.label} must be at least ${rules.min_length} characters.`,
    );
  }

  if (typeof rules.max_length === 'number') {
    schema = schema.max(
      rules.max_length,
      `${field.label} must be at most ${rules.max_length} characters.`,
    );
  }

  if (typeof rules.pattern === 'string' && rules.pattern.length > 0) {
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

function buildNumberSchema(field: DynamicFieldLike): z.ZodType<number | undefined> {
  const rules = (field.validation_rules ?? {}) as Record<string, unknown>;

  let schema = z.number({ message: `${field.label} must be a number.` }).finite();

  if (typeof rules.min === 'number') {
    schema = schema.min(rules.min, `${field.label} must be at least ${rules.min}.`);
  }

  if (typeof rules.max === 'number') {
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

function buildRatingSchema(field: DynamicFieldLike): z.ZodType<number | undefined> {
  const rules = (field.validation_rules ?? {}) as Record<string, unknown>;
  const rawMax = typeof rules.max === 'number' ? rules.max : 5;
  const rawMin = typeof rules.min === 'number' ? rules.min : 1;
  const maxRating = Math.min(Math.max(1, rawMax), 10);
  const minRating = Math.max(1, rawMin);

  const schema = z
    .number({ message: `${field.label} is required.` })
    .int(`${field.label} must be a whole number.`)
    .min(minRating, `${field.label} must be at least ${minRating}.`)
    .max(maxRating, `${field.label} must be at most ${maxRating}.`);

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

function buildSingleChoiceSchema(field: DynamicFieldLike): z.ZodType<string | undefined> {
  const options = field.options ?? [];
  const allowedValues = new Set(options.map((option) => option.value));

  const schema = z
    .string({ message: `${field.label} is required.` })
    .min(1, `${field.label} is required.`)
    .refine((value) => allowedValues.has(value), `${field.label} contains an unsupported option.`);

  if (field.is_required) {
    return schema;
  }

  return z.preprocess(coerceOptionalString, schema.optional()) as z.ZodType<string | undefined>;
}

function buildMultiSelectSchema(field: DynamicFieldLike): z.ZodType<string[] | undefined> {
  const rules = (field.validation_rules ?? {}) as Record<string, unknown>;
  const options = field.options ?? [];
  const allowedValues = new Set(options.map((option) => option.value));

  let schema = z
    .array(z.string())
    .refine(
      (values) => values.every((value) => allowedValues.has(value)),
      `${field.label} contains an unsupported option.`,
    );

  if (field.is_required) {
    schema = schema.min(1, `${field.label} is required.`);
  }

  if (typeof rules.min_selections === 'number') {
    schema = schema.min(
      rules.min_selections,
      `${field.label} requires at least ${rules.min_selections} selection(s).`,
    );
  }

  if (typeof rules.max_selections === 'number') {
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
  field: DynamicFieldLike,
): z.ZodType<Record<string, boolean> | undefined> {
  const rules = (field.validation_rules ?? {}) as Record<string, unknown>;
  const options: DynamicFieldOptionItem[] = (field.options ?? []) as DynamicFieldOptionItem[];
  const allowedValues = new Set(options.map((option) => option.value));
  const toggleDefaultsByValue = new Map(
    options.map((option) => [option.value, option.toggle_default]),
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

  if (typeof rules.min_selections === 'number') {
    schema = schema.refine(
      (values) => Object.keys(values).length >= (rules.min_selections as number),
      `${field.label} requires at least ${rules.min_selections} selection(s).`,
    );
  }

  if (typeof rules.max_selections === 'number') {
    schema = schema.refine(
      (values) => Object.keys(values).length <= (rules.max_selections as number),
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

function buildDateLikeSchema(field: DynamicFieldLike): z.ZodType<string | undefined> {
  const rules = (field.validation_rules ?? {}) as Record<string, unknown>;
  const isDateOnly = field.field_type === 'date';
  const rawWeekdays = rules.allowed_weekdays;
  const allowedWeekdays = Array.isArray(rawWeekdays)
    ? rawWeekdays
        .filter(
          (weekday): weekday is number =>
            typeof weekday === 'number' &&
            Number.isInteger(weekday) &&
            weekday >= 0 &&
            weekday <= 6,
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

  if (typeof rules.min_date === 'string' && rules.min_date.length > 0) {
    const minDate = rules.min_date;
    schema = schema.refine((value) => {
      if (isDateOnly) {
        return value >= minDate;
      }
      return new Date(value).getTime() >= new Date(minDate).getTime();
    }, `${field.label} must be on or after ${minDate}.`);
  }

  if (typeof rules.max_date === 'string' && rules.max_date.length > 0) {
    const maxDate = rules.max_date;
    schema = schema.refine((value) => {
      if (isDateOnly) {
        return value <= maxDate;
      }
      return new Date(value).getTime() <= new Date(maxDate).getTime();
    }, `${field.label} must be on or before ${maxDate}.`);
  }

  if (typeof rules.max_past_days === 'number' && Number.isInteger(rules.max_past_days)) {
    const maxPastDays = rules.max_past_days;
    schema = schema.refine((value) => {
      const oldestAllowedDate = getStartOfLocalDay(new Date());
      oldestAllowedDate.setDate(oldestAllowedDate.getDate() - maxPastDays);

      const selectedDate = parseLocalDateFromYyyyMmDd(value);
      if (!selectedDate) {
        return false;
      }

      return selectedDate.getTime() >= oldestAllowedDate.getTime();
    }, `${field.label} cannot be more than ${maxPastDays} day(s) in the past.`);
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

function buildBooleanSchema(field: DynamicFieldLike): z.ZodType<boolean | undefined> {
  if (field.is_required) {
    return z.literal(true, {
      message: `${field.label} must be accepted.`,
    }) as unknown as z.ZodType<boolean | undefined>;
  }

  return z.boolean().optional() as z.ZodType<boolean | undefined>;
}

export function buildSchemaForField(field: DynamicFieldLike): z.ZodType<unknown> {
  switch (field.field_type) {
    case 'number':
      return buildNumberSchema(field);
    case 'rating':
      return buildRatingSchema(field);
    case 'email': {
      let schema = z.string().trim().email(`${field.label} must be a valid email address.`);
      if (field.is_required) {
        schema = schema.min(1, `${field.label} is required.`);
        return schema;
      }
      return z.preprocess(coerceOptionalString, schema.optional());
    }
    case 'phone': {
      let schema = buildStringSchema(field);
      const phonePattern = VALIDATION_PATTERNS.phone;
      schema = schema.refine(
        (value) => value === undefined || phonePattern.test(value),
        `${field.label} must be a valid phone number.`,
      ) as z.ZodType<string | undefined>;
      return schema;
    }
    case 'select':
    case 'radio':
      return buildSingleChoiceSchema(field);
    case 'multi_select':
      return buildMultiSelectSchema(field);
    case 'multi_select_toggle':
      return buildMultiSelectToggleSchema(field);
    case 'date':
    case 'datetime':
      return buildDateLikeSchema(field);
    case 'checkbox':
    case 'boolean':
      return buildBooleanSchema(field);
    case 'textarea':
    case 'text':
    case 'color_picker':
    default:
      return buildStringSchema(field);
  }
}

export function buildDynamicFieldResponseSchema<T extends DynamicFieldLike>(
  fields: T[],
): z.ZodObject<Record<string, z.ZodType<unknown>>> {
  const shape: Record<string, z.ZodType<unknown>> = {};

  fields.forEach((field) => {
    shape[field.field_key] = buildSchemaForField(field);
  });

  return z.object(shape);
}
