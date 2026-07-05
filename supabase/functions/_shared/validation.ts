import { z } from 'https://esm.sh/zod@3.25.76';

export { z };

const functionEnvironmentSchema = z.object({
  SUPABASE_URL: z.string().trim().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
});

export type FunctionEnvironment = {
  supabaseUrl: string;
  supabaseServiceKey: string;
};

export function parseFunctionEnvironment(): FunctionEnvironment | null {
  const parsed = functionEnvironmentSchema.safeParse({
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  });

  if (!parsed.success) {
    return null;
  }

  return {
    supabaseUrl: parsed.data.SUPABASE_URL,
    supabaseServiceKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export async function parseRequestBody<TSchema extends z.ZodTypeAny>(
  req: Request,
  schema: TSchema,
): Promise<
  { success: true; data: z.infer<TSchema> } | { success: false; error: string; details?: string }
> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return {
      success: false,
      error: 'Invalid JSON payload',
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Invalid request payload',
      details: parsed.error.issues
        .map((issue) => {
          const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
          return `${path}${issue.message}`;
        })
        .join('; '),
    };
  }

  return { success: true, data: parsed.data };
}

// Field validation types
export interface FieldValidationError {
  fieldKey: string;
  message: string;
}

export interface EventFieldWithValidation {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  options: { label: string; value: string }[];
  validation_rules: Record<string, unknown>;
}

export interface StoredAnswerWithOptionValue {
  answer_text?: string | null;
  answer_json?: unknown;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonIfString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeOptionValues(values: string[]): string[] {
  const seen = new Set<string>();

  return values.reduce<string[]>((acc, value) => {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      return acc;
    }

    seen.add(trimmed);
    acc.push(trimmed);
    return acc;
  }, []);
}

export function parseMaxSlotsByOption(
  validationRules: Record<string, unknown> | null | undefined,
): Record<string, number> {
  if (!validationRules) {
    return {};
  }

  const rawMaxSlots = validationRules.max_slots;
  if (!isObjectRecord(rawMaxSlots)) {
    return {};
  }

  return Object.entries(rawMaxSlots).reduce<Record<string, number>>((acc, [option, rawValue]) => {
    if (
      typeof rawValue === 'number' &&
      Number.isFinite(rawValue) &&
      Number.isInteger(rawValue) &&
      rawValue > 0
    ) {
      acc[option] = rawValue;
    }

    return acc;
  }, {});
}

export function normalizeRoleValue(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function normalizePrimaryRoleValue(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) {
    return null;
  }

  const primaryRole = raw
    .split('/')
    .map((segment) => segment.trim())
    .find((segment) => segment.length > 0);

  return normalizeRoleValue(primaryRole);
}

export function parseMaxSlotRoleAllotmentsByOption(
  validationRules: Record<string, unknown> | null | undefined,
): Record<string, Record<string, number>> {
  if (!validationRules) {
    return {};
  }

  const rawAllotments = validationRules.max_slots_role_allotments;
  if (!isObjectRecord(rawAllotments)) {
    return {};
  }

  return Object.entries(rawAllotments).reduce<Record<string, Record<string, number>>>(
    (acc, [option, rawEntry]) => {
      if (Array.isArray(rawEntry)) {
        const perRoleAllotment = rawEntry.reduce<Record<string, number>>((roleAcc, entry) => {
          if (!isObjectRecord(entry)) {
            return roleAcc;
          }

          const roleValue = typeof entry.role === 'string' ? entry.role : null;
          const normalizedRole = normalizeRoleValue(roleValue);
          if (!normalizedRole) {
            return roleAcc;
          }

          const rawLimit = entry.alloted_slots;
          if (
            typeof rawLimit === 'number' &&
            Number.isFinite(rawLimit) &&
            Number.isInteger(rawLimit) &&
            rawLimit > 0
          ) {
            roleAcc[normalizedRole] = rawLimit;
          }

          return roleAcc;
        }, {});

        if (Object.keys(perRoleAllotment).length > 0) {
          acc[option] = perRoleAllotment;
        }

        return acc;
      }

      // Backward compatibility for legacy role-keyed object shape.
      if (!isObjectRecord(rawEntry)) {
        return acc;
      }

      const perRoleAllotment = Object.entries(rawEntry).reduce<Record<string, number>>(
        (roleAcc, [role, rawLimit]) => {
          const normalizedRole = normalizeRoleValue(role);
          if (!normalizedRole) {
            return roleAcc;
          }

          if (
            typeof rawLimit === 'number' &&
            Number.isFinite(rawLimit) &&
            Number.isInteger(rawLimit) &&
            rawLimit > 0
          ) {
            roleAcc[normalizedRole] = rawLimit;
          }

          return roleAcc;
        },
        {},
      );

      if (Object.keys(perRoleAllotment).length > 0) {
        acc[option] = perRoleAllotment;
      }

      return acc;
    },
    {},
  );
}

type CapacityConstrainedFieldType = 'select' | 'radio' | 'multi_select' | 'multi_select_toggle';

export interface OptionCapacityContext {
  maxSlotsByOption: Record<string, number>;
  roleAllotmentsByOption: Record<string, Record<string, number>>;
  constrainedSelections: string[];
}

export interface FieldOptionCapacityWorkItem extends OptionCapacityContext {
  field: EventFieldWithValidation;
  fieldKey: string;
  slotConsumingSelectionsWithoutRole: string[];
}

function isCapacityConstrainedFieldType(
  fieldType: string,
): fieldType is CapacityConstrainedFieldType {
  return (
    fieldType === 'select' ||
    fieldType === 'radio' ||
    fieldType === 'multi_select' ||
    fieldType === 'multi_select_toggle'
  );
}

/**
 * Builds the option-capacity context for a field response, including derived max slots from role allotments.
 */
export function buildOptionCapacityContext(
  fieldType: string,
  validationRules: Record<string, unknown> | null | undefined,
  responseValue: unknown,
): OptionCapacityContext | null {
  if (!isCapacityConstrainedFieldType(fieldType)) {
    return null;
  }

  const roleAllotmentsByOption = parseMaxSlotRoleAllotmentsByOption(validationRules);
  const maxSlotsByOption = {
    ...parseMaxSlotsByOption(validationRules),
  };

  for (const [optionValue, roleAllotments] of Object.entries(roleAllotmentsByOption)) {
    const derivedSlots = Object.values(roleAllotments).reduce((sum, slots) => sum + slots, 0);
    if (derivedSlots > 0) {
      maxSlotsByOption[optionValue] = derivedSlots;
    }
  }

  if (Object.keys(maxSlotsByOption).length === 0) {
    // Missing option capacity means open/unlimited registration.
    return null;
  }

  const selectedOptions = extractSelectedOptionValues(fieldType, responseValue);
  if (selectedOptions.length === 0) {
    return null;
  }

  const constrainedSelections = selectedOptions.filter(
    (optionValue) => maxSlotsByOption[optionValue] !== undefined,
  );
  if (constrainedSelections.length === 0) {
    return null;
  }

  return {
    maxSlotsByOption,
    roleAllotmentsByOption,
    constrainedSelections,
  };
}

/**
 * Filters selections to options where slots are consumed without role matching.
 */
export function getSlotConsumingSelectionsWithoutRole(
  constrainedSelections: string[],
  roleAllotmentsByOption: Record<string, Record<string, number>>,
): string[] {
  return constrainedSelections.filter((optionValue) => {
    const roleAllotmentsForOption = roleAllotmentsByOption[optionValue] ?? {};
    return Object.keys(roleAllotmentsForOption).length === 0;
  });
}

/**
 * Builds all field-level capacity work items for the provided response payload.
 */
export function buildFieldOptionCapacityWorkItems(
  fields: EventFieldWithValidation[],
  responses: Record<string, unknown>,
): FieldOptionCapacityWorkItem[] {
  return fields.reduce<FieldOptionCapacityWorkItem[]>((acc, field) => {
    const fieldKey = field.field_key;
    const capacityContext = buildOptionCapacityContext(
      field.field_type,
      field.validation_rules,
      responses[fieldKey],
    );

    if (!capacityContext) {
      return acc;
    }

    acc.push({
      field,
      fieldKey,
      ...capacityContext,
      slotConsumingSelectionsWithoutRole: getSlotConsumingSelectionsWithoutRole(
        capacityContext.constrainedSelections,
        capacityContext.roleAllotmentsByOption,
      ),
    });

    return acc;
  }, []);
}

export function createOptionUsageCounter(optionValues: string[]): Record<string, number> {
  return optionValues.reduce<Record<string, number>>((acc, option) => {
    acc[option] = 0;
    return acc;
  }, {});
}

export function incrementOptionUsageFromSelection(
  usageByOption: Record<string, number>,
  optionValues: string[],
  usedOptions: string[],
): void {
  for (const option of optionValues) {
    if (usedOptions.includes(option)) {
      usageByOption[option] = (usageByOption[option] ?? 0) + 1;
    }
  }
}

type OptionValueLabelEntry = {
  value: string;
  label: string;
};

type FullCapacityValidationParams = {
  fieldKey: string;
  fieldLabel: string;
  optionValues: string[];
  options: OptionValueLabelEntry[];
  maxSlotsByOption: Record<string, number>;
  usageByOption: Record<string, number>;
};

export function buildFullCapacityValidationErrors(
  params: FullCapacityValidationParams,
): FieldValidationError[] {
  const { fieldKey, fieldLabel, optionValues, options, maxSlotsByOption, usageByOption } = params;

  const optionLabelByValue = new Map(options.map((entry) => [entry.value, entry.label]));

  return optionValues.reduce<FieldValidationError[]>((errors, option) => {
    const maxSlots = maxSlotsByOption[option];
    const usedSlots = usageByOption[option] ?? 0;

    if (typeof maxSlots === 'number' && usedSlots >= maxSlots) {
      const optionLabel = optionLabelByValue.get(option) ?? option;
      errors.push({
        fieldKey,
        message: `${fieldLabel} option "${optionLabel}" is already full. Please select another option.`,
      });
    }

    return errors;
  }, []);
}

export function extractSelectedOptionValues(fieldType: string, value: unknown): string[] {
  if (fieldType === 'select' || fieldType === 'radio') {
    return typeof value === 'string' ? normalizeOptionValues([value]) : [];
  }

  if (fieldType === 'multi_select') {
    if (Array.isArray(value)) {
      return normalizeOptionValues(value.map((entry) => String(entry)));
    }

    if (typeof value === 'string') {
      return normalizeOptionValues([value]);
    }

    return [];
  }

  if (fieldType === 'multi_select_toggle' && isObjectRecord(value)) {
    // Checked options consume slots regardless of Yes/No value.
    return normalizeOptionValues(Object.keys(value));
  }

  return [];
}

export function extractSelectedOptionValuesFromStoredAnswer(
  fieldType: string,
  answer: StoredAnswerWithOptionValue,
): string[] {
  if (fieldType === 'select' || fieldType === 'radio') {
    return typeof answer.answer_text === 'string'
      ? normalizeOptionValues([answer.answer_text])
      : [];
  }

  if (fieldType === 'multi_select') {
    const normalizedJson = parseJsonIfString(answer.answer_json);
    if (Array.isArray(normalizedJson)) {
      return normalizeOptionValues(normalizedJson.map((entry) => String(entry)));
    }

    const parsedText = parseJsonIfString(answer.answer_text);
    if (Array.isArray(parsedText)) {
      return normalizeOptionValues(parsedText.map((entry) => String(entry)));
    }

    if (typeof answer.answer_text === 'string') {
      return normalizeOptionValues([answer.answer_text]);
    }

    return [];
  }

  if (fieldType === 'multi_select_toggle') {
    const normalizedJson = parseJsonIfString(answer.answer_json);
    if (isObjectRecord(normalizedJson)) {
      return normalizeOptionValues(Object.keys(normalizedJson));
    }

    if (
      Array.isArray(normalizedJson) &&
      normalizedJson.length > 0 &&
      isObjectRecord(normalizedJson[0])
    ) {
      return normalizeOptionValues(Object.keys(normalizedJson[0]));
    }

    const parsedText = parseJsonIfString(answer.answer_text);
    if (isObjectRecord(parsedText)) {
      return normalizeOptionValues(Object.keys(parsedText));
    }

    return [];
  }

  return [];
}

/**
 * Builds a Zod schema for a field based on its type and validation rules.
 */
function buildFieldSchema(field: EventFieldWithValidation, label: string): z.ZodTypeAny {
  const rules = (field.validation_rules || {}) as Record<string, unknown>;
  const type = field.field_type;

  let schema: z.ZodTypeAny;

  // Text-like fields
  if (type === 'text' || type === 'textarea' || type === 'email' || type === 'phone') {
    schema = z.string();

    const minLength = rules.min_length as number | undefined;
    if (minLength !== undefined) {
      schema = schema.min(minLength, `${label} must be at least ${minLength} characters.`);
    }

    const maxLength = rules.max_length as number | undefined;
    if (maxLength !== undefined) {
      schema = schema.max(maxLength, `${label} must be at most ${maxLength} characters.`);
    }

    if (rules.pattern && typeof rules.pattern === 'string') {
      try {
        const regex = new RegExp(rules.pattern);
        schema = schema.regex(regex, `${label} format is invalid.`);
      } catch {
        // Ignore invalid regex patterns
      }
    }

    if (type === 'email') {
      schema = schema.email(`${label} must be a valid email address.`);
    }

    if (type === 'phone') {
      schema = schema.refine((val) => /\d/.test(val), `${label} must be a valid phone number.`);
    }
  }
  // Number field
  else if (type === 'number') {
    schema = z.coerce.number();

    const min = rules.min as number | undefined;
    if (min !== undefined) {
      schema = schema.min(min, `${label} must be at least ${min}.`);
    }

    const max = rules.max as number | undefined;
    if (max !== undefined) {
      schema = schema.max(max, `${label} must be at most ${max}.`);
    }
  }
  // Single choice fields
  else if (type === 'select' || type === 'radio') {
    const allowedValues = field.options.map((opt) => opt.value);
    schema = z
      .string()
      .refine((val) => allowedValues.includes(val), `${label} contains an unsupported option.`);
  }
  // Boolean field
  else if (type === 'boolean') {
    schema = z.union([
      z.boolean(),
      z.literal('true'),
      z.literal('false'),
      z.literal(0),
      z.literal(1),
    ]);
  }
  // Multi-select field
  else if (type === 'multi_select') {
    const allowedValues = field.options.map((opt) => opt.value);
    schema = z
      .union([z.array(z.string()), z.string().transform((val) => [val])])
      .refine((arr) => arr.every((item) => allowedValues.includes(item)), {
        message: `${label} contains an unsupported option.`,
      });

    const minSelections = rules.min_selections as number | undefined;
    if (minSelections !== undefined) {
      schema = schema.refine((arr) => arr.length >= minSelections, {
        message: `${label} requires at least ${minSelections} selection(s).`,
      });
    }

    const maxSelections = rules.max_selections as number | undefined;
    if (maxSelections !== undefined) {
      schema = schema.refine((arr) => arr.length <= maxSelections, {
        message: `${label} allows at most ${maxSelections} selection(s).`,
      });
    }
  }
  // Multi-select + toggle field
  else if (type === 'multi_select_toggle') {
    const allowedValues = field.options.map((opt) => opt.value);
    schema = z
      .record(z.boolean())
      .refine((obj) => Object.keys(obj).every((k) => allowedValues.includes(k)), {
        message: `${label} contains an unsupported option.`,
      });

    const minSelections = rules.min_selections as number | undefined;
    if (minSelections !== undefined) {
      schema = schema.refine((obj) => Object.keys(obj).length >= minSelections, {
        message: `${label} requires at least ${minSelections} selection(s).`,
      });
    }

    const maxSelections = rules.max_selections as number | undefined;
    if (maxSelections !== undefined) {
      schema = schema.refine((obj) => Object.keys(obj).length <= maxSelections, {
        message: `${label} allows at most ${maxSelections} selection(s).`,
      });
    }
  }
  // Date/datetime field
  else if (type === 'date' || type === 'datetime') {
    const isDateOnly = type === 'date';
    const dateRegex = isDateOnly ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

    schema = z
      .string()
      .regex(
        dateRegex,
        `${label} must use a valid ${isDateOnly ? 'date' : 'date and time'} format.`,
      );

    const minDate = rules.min_date as string | undefined;
    if (minDate) {
      schema = schema.refine((val) => val >= minDate, `${label} must be on or after ${minDate}.`);
    }

    const maxDate = rules.max_date as string | undefined;
    if (maxDate) {
      schema = schema.refine((val) => val <= maxDate, `${label} must be on or before ${maxDate}.`);
    }
  } else {
    schema = z.unknown();
  }

  // Apply required check
  if (field.is_required) {
    schema = schema.refine(
      (v) => v !== null && v !== undefined && v !== '',
      `${label} is required.`,
    );
  }

  return schema;
}

/**
 * Validates a single field value against its schema and validation rules using Zod.
 * Returns validation error if invalid, null if valid.
 */
export function validateFieldValue(
  fieldKey: string,
  value: unknown,
  field: EventFieldWithValidation,
): FieldValidationError | null {
  const label = field.label || fieldKey;

  // Optional empty values are valid (skip validation entirely)
  if (!field.is_required && (value === null || value === undefined || value === '')) {
    return null;
  }

  const schema = buildFieldSchema(field, label);
  const result = schema.safeParse(value);

  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      fieldKey,
      message: issue.message || `${label} is invalid.`,
    };
  }

  return null;
}
