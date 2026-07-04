import { useCallback } from 'react';

import type { EventFieldType } from '@/lib/domain/event-fields';

export type FieldAnswerValue = {
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean?: boolean | null;
  answer_date?: string | null;
  answer_json?: unknown;
};

/**
 * Provides shared helpers to render stored field answers as readable plain text.
 */
export function useFieldAnswerTextFormatter() {
  const formatDisplayValue = useCallback((value: unknown): string => {
    if (value === null || value === undefined) {
      return '—';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }, []);

  const tryParseJsonLikeString = useCallback((value: string): unknown => {
    let candidate = value.trim();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (candidate.length === 0) {
        return null;
      }

      try {
        const parsed = JSON.parse(candidate) as unknown;
        if (typeof parsed !== 'string') {
          return parsed;
        }

        candidate = parsed.trim();
        continue;
      } catch {
        const unescapedCandidate = candidate.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        if (unescapedCandidate !== candidate) {
          candidate = unescapedCandidate;
          continue;
        }

        return value;
      }
    }

    return candidate;
  }, []);

  const readStoredValue = useCallback(
    (answer: FieldAnswerValue): unknown => {
      const rawValue =
        answer.answer_text ??
        answer.answer_number ??
        answer.answer_boolean ??
        answer.answer_date ??
        answer.answer_json;

      if (rawValue === null || rawValue === undefined) {
        return null;
      }

      if (typeof rawValue !== 'string') {
        return rawValue;
      }

      const normalized = rawValue.trim();
      if (normalized.length === 0) {
        return null;
      }

      return tryParseJsonLikeString(normalized);
    },
    [tryParseJsonLikeString],
  );

  const readBooleanMapEntries = useCallback((value: unknown): Array<[string, boolean]> | null => {
    const normalizedValue =
      Array.isArray(value) && value.length === 1 && typeof value[0] === 'object' && value[0]
        ? value[0]
        : value;

    if (!normalizedValue || typeof normalizedValue !== 'object' || Array.isArray(normalizedValue)) {
      return null;
    }

    const entries = Object.entries(normalizedValue as Record<string, unknown>);
    const hasOnlyBooleanValues =
      entries.length > 0 && entries.every(([, entryValue]) => typeof entryValue === 'boolean');

    if (!hasOnlyBooleanValues) {
      return null;
    }

    return entries.map(([key, entryValue]) => [key, entryValue as boolean]);
  }, []);

  const getAnswerText = useCallback(
    (fieldType: EventFieldType, answer: FieldAnswerValue): string => {
      const parsed = readStoredValue(answer);

      if (parsed === null) {
        return '—';
      }

      switch (fieldType) {
        case 'boolean': {
          if (parsed === true || String(parsed).toLowerCase() === 'true') {
            return 'Yes';
          }

          if (parsed === false || String(parsed).toLowerCase() === 'false') {
            return 'No';
          }

          break;
        }

        case 'multi_select_toggle': {
          const toggleEntries = readBooleanMapEntries(parsed);
          if (toggleEntries) {
            return toggleEntries
              .map(([key, value]) => `${key} (${value === true ? 'Yes' : 'No'})`)
              .join(', ');
          }

          break;
        }

        case 'radio':
        case 'multi_select':
        case 'checkbox': {
          const booleanMapEntries = readBooleanMapEntries(parsed);
          if (booleanMapEntries) {
            const selectedKeys = booleanMapEntries
              .filter(([, value]) => value === true)
              .map(([key]) => key);
            if (selectedKeys.length > 0) {
              return selectedKeys.join(', ');
            }
          }

          if (Array.isArray(parsed)) {
            return parsed.length > 0
              ? parsed.map((value) => formatDisplayValue(value)).join(', ')
              : '—';
          }

          if (typeof parsed === 'string') {
            return parsed.trim().length > 0 ? parsed : '—';
          }

          break;
        }

        default:
          break;
      }

      if (Array.isArray(parsed)) {
        return parsed.length > 0
          ? parsed.map((value) => formatDisplayValue(value)).join(', ')
          : '—';
      }

      if (parsed && typeof parsed === 'object') {
        const booleanMapEntries = readBooleanMapEntries(parsed);
        if (booleanMapEntries) {
          const selectedKeys = booleanMapEntries
            .filter(([, value]) => value === true)
            .map(([key]) => key);
          return selectedKeys.length > 0 ? selectedKeys.join(', ') : '—';
        }

        const entries = Object.entries(parsed as Record<string, unknown>);

        const nonEmptyEntries = entries.filter(([, value]) => {
          if (value === null || value === false) {
            return false;
          }
          if (typeof value === 'string') {
            return value.trim().length > 0;
          }
          return true;
        });

        if (nonEmptyEntries.length > 0) {
          return nonEmptyEntries
            .map(([key, value]) => `${key}: ${formatDisplayValue(value)}`)
            .join(', ');
        }

        return '—';
      }

      if (typeof parsed === 'string') {
        return parsed.trim().length > 0 ? parsed : '—';
      }

      return String(parsed);
    },
    [formatDisplayValue, readBooleanMapEntries, readStoredValue],
  );

  return {
    getAnswerText,
  };
}
