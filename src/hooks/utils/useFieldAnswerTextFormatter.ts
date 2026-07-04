import { useCallback } from 'react';

import type { EventFieldType } from '@/lib/domain/event-fields';

export type FieldAnswerValue = {
  answer_text: string | null;
  answer_number: number | null;
};

export type AnswerDisplayModel =
  | {
      kind: 'text';
      text: string;
    }
  | {
      kind: 'toggle';
      entries: Array<{
        label: string;
        valueLabel: 'Yes' | 'No';
      }>;
    };

/**
 * Provides shared helpers to render stored field answers as readable plain text.
 */
export function useFieldAnswerTextFormatter() {
  const readStoredValue = useCallback((answer: FieldAnswerValue): unknown => {
    const rawValue = answer.answer_text ?? answer.answer_number;

    if (rawValue === null || rawValue === undefined) {
      return null;
    }

    if (typeof rawValue !== 'string') {
      return rawValue;
    }

    const normalized = rawValue.trim();
    if (!normalized.startsWith('{') && !normalized.startsWith('[')) {
      return rawValue;
    }

    try {
      return JSON.parse(normalized) as unknown;
    } catch {
      return rawValue;
    }
  }, []);

  const parseToggleBooleanEntries = useCallback(
    (fieldType: EventFieldType, answer: FieldAnswerValue): Array<[string, boolean]> | null => {
      if (fieldType !== 'multi_select_toggle') {
        return null;
      }

      const parsed = readStoredValue(answer);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
      }

      const entries = Object.entries(parsed as Record<string, unknown>);
      const hasOnlyBooleanValues =
        entries.length > 0 && entries.every(([, value]) => typeof value === 'boolean');

      if (!hasOnlyBooleanValues) {
        return null;
      }

      return entries.map(([key, value]) => [key, value as boolean]);
    },
    [readStoredValue],
  );

  const formatAnswerValue = useCallback(
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
          const toggleEntries = parseToggleBooleanEntries(fieldType, answer);
          if (toggleEntries) {
            return toggleEntries
              .map(([key, value]) => `${key} (${value === true ? 'Yes' : 'No'})`)
              .join(', ');
          }

          break;
        }

        case 'multi_select': {
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const entries = Object.entries(parsed as Record<string, unknown>);
            const selectedKeys = entries.filter(([, value]) => value === true).map(([key]) => key);
            if (selectedKeys.length > 0) {
              return selectedKeys.join(', ');
            }
          }

          break;
        }

        default:
          break;
      }

      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed.map((value) => String(value)).join(', ') : '—';
      }

      if (parsed && typeof parsed === 'object') {
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
          return nonEmptyEntries.map(([key, value]) => `${key}: ${String(value)}`).join(', ');
        }

        return '—';
      }

      if (typeof parsed === 'string') {
        return parsed.trim().length > 0 ? parsed : '—';
      }

      return String(parsed);
    },
    [parseToggleBooleanEntries, readStoredValue],
  );

  const getAnswerDisplayModel = useCallback(
    (fieldType: EventFieldType, answer: FieldAnswerValue): AnswerDisplayModel => {
      const toggleEntries = parseToggleBooleanEntries(fieldType, answer);

      if (toggleEntries) {
        return {
          kind: 'toggle',
          entries: toggleEntries.map(([label, value]) => ({
            label,
            valueLabel: value ? 'Yes' : 'No',
          })),
        };
      }

      return {
        kind: 'text',
        text: formatAnswerValue(fieldType, answer),
      };
    },
    [formatAnswerValue, parseToggleBooleanEntries],
  );

  return {
    getAnswerDisplayModel,
  };
}
