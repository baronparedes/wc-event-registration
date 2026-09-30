import { z } from '@/shared/validation.ts';

const bulkRowSchema = z.object({
  member_id: z.string().trim().min(1, 'member_id is required'),
  registration_id: z.string().trim().optional(),
  answers: z.record(z.string(), z.unknown()),
});

export const requestSchema = z.object({
  event_id: z.string().uuid('event_id must be a valid UUID'),
  rows: z.array(bulkRowSchema).min(1, 'rows must include at least one item'),
  uploaded_field_keys: z.array(z.string()).optional(),
});

export type RequestPayload = z.infer<typeof requestSchema>;
export type BulkRow = RequestPayload['rows'][number];

export type EventFieldRow = {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  options: Array<{ label: string; value: string }> | null;
  validation_rules: Record<string, unknown> | null;
};

export const IN_FILTER_CHUNK_SIZE = 200;

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes' || normalized === '1') return true;
    if (normalized === 'false' || normalized === 'no' || normalized === '0') return false;
  }

  return null;
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[|;]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }

  return [];
}

function parseToggleMap(value: unknown): Record<string, boolean> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.reduce<Record<string, boolean> | null>((acc, [key, rawValue]) => {
      if (!acc) return null;
      const boolValue = parseBoolean(rawValue);
      if (!key.trim() || boolValue === null) return null;
      acc[key.trim()] = boolValue;
      return acc;
    }, {});
  }

  if (typeof value === 'string') {
    const parts = parseList(value);
    return parts.reduce<Record<string, boolean> | null>((acc, part) => {
      if (!acc) return null;
      const separatorIndex = part.indexOf(':');
      if (separatorIndex <= 0) return null;

      const key = part.slice(0, separatorIndex).trim();
      const boolValue = parseBoolean(part.slice(separatorIndex + 1).trim());

      if (!key || boolValue === null) return null;
      acc[key] = boolValue;
      return acc;
    }, {});
  }

  return null;
}

/** Normalizes an answer value into the same answer_text encoding used by persistAnswers. */
export function normalizeAnswer(
  field: EventFieldRow,
  rawValue: unknown,
): { hasValue: boolean; answerText: string | null; error?: string } {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    if (field.is_required) {
      return { hasValue: false, answerText: null, error: `${field.label} is required.` };
    }
    return { hasValue: false, answerText: null };
  }

  const rules = field.validation_rules ?? {};
  const optionValues = new Set((field.options ?? []).map((option) => option.value));

  if (field.field_type === 'number') {
    const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return { hasValue: false, answerText: null, error: `${field.label}: value must be numeric.` };
    }

    const min = typeof rules.min === 'number' ? rules.min : undefined;
    const max = typeof rules.max === 'number' ? rules.max : undefined;
    if (typeof min === 'number' && parsed < min) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: value must be at least ${min}.`,
      };
    }
    if (typeof max === 'number' && parsed > max) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: value must be at most ${max}.`,
      };
    }

    return { hasValue: true, answerText: String(parsed) };
  }

  if (field.field_type === 'boolean' || field.field_type === 'checkbox') {
    const parsed = parseBoolean(rawValue);
    if (parsed === null) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: value must be true/false.`,
      };
    }
    return { hasValue: true, answerText: parsed ? 'true' : 'false' };
  }

  if (field.field_type === 'select' || field.field_type === 'radio') {
    const normalized = String(rawValue).trim();
    if (!normalized) {
      return { hasValue: false, answerText: null };
    }
    if (optionValues.size > 0 && !optionValues.has(normalized)) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: contains unsupported option value.`,
      };
    }
    return { hasValue: true, answerText: normalized };
  }

  if (field.field_type === 'multi_select') {
    const selected = parseList(rawValue);
    if (selected.length === 0) {
      return { hasValue: false, answerText: null };
    }
    if (optionValues.size > 0 && selected.some((value) => !optionValues.has(value))) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: contains unsupported option value(s).`,
      };
    }

    const minSelections =
      typeof rules.min_selections === 'number' ? rules.min_selections : undefined;
    const maxSelections =
      typeof rules.max_selections === 'number' ? rules.max_selections : undefined;
    if (typeof minSelections === 'number' && selected.length < minSelections) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: requires at least ${minSelections} selection(s).`,
      };
    }
    if (typeof maxSelections === 'number' && selected.length > maxSelections) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: allows at most ${maxSelections} selection(s).`,
      };
    }

    return { hasValue: true, answerText: JSON.stringify(selected) };
  }

  if (field.field_type === 'multi_select_toggle') {
    const parsedMap = parseToggleMap(rawValue);
    if (!parsedMap || Object.keys(parsedMap).length === 0) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: expected key:true/false pairs.`,
      };
    }
    if (optionValues.size > 0 && Object.keys(parsedMap).some((value) => !optionValues.has(value))) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: contains unsupported option value(s).`,
      };
    }

    return { hasValue: true, answerText: JSON.stringify(parsedMap) };
  }

  const normalized = String(rawValue).trim();
  if (!normalized) {
    return { hasValue: false, answerText: null };
  }

  const minLength = typeof rules.min_length === 'number' ? rules.min_length : undefined;
  const maxLength = typeof rules.max_length === 'number' ? rules.max_length : undefined;
  if (typeof minLength === 'number' && normalized.length < minLength) {
    return {
      hasValue: false,
      answerText: null,
      error: `${field.label}: must be at least ${minLength} characters.`,
    };
  }
  if (typeof maxLength === 'number' && normalized.length > maxLength) {
    return {
      hasValue: false,
      answerText: null,
      error: `${field.label}: must be at most ${maxLength} characters.`,
    };
  }

  return { hasValue: true, answerText: normalized };
}
