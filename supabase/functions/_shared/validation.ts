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
