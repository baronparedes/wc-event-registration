import { getFieldDefinition } from './registry';
import type { DynamicAnswerLike, DynamicFieldType, FormatValueContext } from './types';

/**
 * Extracts the raw, typed JavaScript value from a polymorphic answer object.
 */
export function extractAnswerRawValue(answer: DynamicAnswerLike): unknown {
  if (answer.answer_json !== null && answer.answer_json !== undefined) {
    return answer.answer_json;
  }

  if (answer.answer_number !== null && answer.answer_number !== undefined) {
    return answer.answer_number;
  }

  if (answer.answer_boolean !== null && answer.answer_boolean !== undefined) {
    return answer.answer_boolean;
  }

  if (
    answer.answer_date !== null &&
    answer.answer_date !== undefined &&
    answer.answer_date !== ''
  ) {
    return answer.answer_date;
  }

  if (answer.answer_text !== null && answer.answer_text !== undefined) {
    return answer.answer_text;
  }

  return null;
}

/**
 * Safely parses a multi-select answer value into an array of string choices.
 * Supports raw string[], JSON string array, or comma-separated string.
 */
export function parseMultiSelectAnswer(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(String).filter((item) => item.trim().length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(String).filter((item) => item.trim().length > 0);
        }
      } catch {
        // Fallback to raw string
      }
    }
    return trimmed.length > 0 ? [trimmed] : [];
  }

  return [String(value)];
}

/**
 * Safely parses a multi_select_toggle answer value into a Map or Record<string, boolean>.
 * Supports JSON objects { [key]: boolean } or JSON strings.
 */
export function parseMultiSelectToggleAnswer(value: unknown): Record<string, boolean> {
  if (!value) {
    return {};
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const record: Record<string, boolean> = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      if (typeof v === 'boolean') {
        record[k] = v;
      }
    });
    return record;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          const record: Record<string, boolean> = {};
          Object.entries(parsed as Record<string, unknown>).forEach(([k, v]) => {
            if (typeof v === 'boolean') {
              record[k] = v;
            }
          });
          return record;
        }
      } catch {
        // Fallback
      }
    }
  }

  return {};
}

/**
 * Formats a dynamic field answer for display using its field type definition.
 */
export function formatAnswerValue(
  fieldType: DynamicFieldType,
  answer: DynamicAnswerLike,
  context?: FormatValueContext,
): string {
  const rawValue = extractAnswerRawValue(answer);
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return '—';
  }

  const definition = getFieldDefinition(fieldType);
  return definition.formatValue(rawValue, context);
}
