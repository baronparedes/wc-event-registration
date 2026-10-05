import { describe, expect, it } from 'vitest';

import {
  extractAnswerRawValue,
  formatAnswerValue,
  parseMultiSelectAnswer,
  parseMultiSelectToggleAnswer,
} from '../parsing';

describe('dynamic-fields parsing', () => {
  describe('extractAnswerRawValue', () => {
    it('prioritizes answer_json when present', () => {
      expect(
        extractAnswerRawValue({
          answer_json: { key: 'value' },
          answer_text: 'fallback',
        }),
      ).toEqual({ key: 'value' });
    });

    it('extracts number, boolean, date, and text answers properly', () => {
      expect(extractAnswerRawValue({ answer_number: 42 })).toBe(42);
      expect(extractAnswerRawValue({ answer_boolean: true })).toBe(true);
      expect(extractAnswerRawValue({ answer_date: '2026-10-05' })).toBe('2026-10-05');
      expect(extractAnswerRawValue({ answer_text: 'Hello' })).toBe('Hello');
      expect(extractAnswerRawValue({})).toBe(null);
    });
  });

  describe('parseMultiSelectAnswer', () => {
    it('parses arrays, json strings, and scalar strings', () => {
      expect(parseMultiSelectAnswer(['A', 'B'])).toEqual(['A', 'B']);
      expect(parseMultiSelectAnswer('["A", "B"]')).toEqual(['A', 'B']);
      expect(parseMultiSelectAnswer('Single')).toEqual(['Single']);
      expect(parseMultiSelectAnswer(null)).toEqual([]);
      expect(parseMultiSelectAnswer('')).toEqual([]);
    });
  });

  describe('parseMultiSelectToggleAnswer', () => {
    it('parses objects and json strings', () => {
      expect(parseMultiSelectToggleAnswer({ opt1: true, opt2: false })).toEqual({
        opt1: true,
        opt2: false,
      });
      expect(parseMultiSelectToggleAnswer('{"opt1": true, "opt2": false}')).toEqual({
        opt1: true,
        opt2: false,
      });
      expect(parseMultiSelectToggleAnswer(null)).toEqual({});
      expect(parseMultiSelectToggleAnswer('invalid-json')).toEqual({});
    });
  });

  describe('formatAnswerValue', () => {
    it('formats rating values with stars', () => {
      expect(formatAnswerValue('rating', { answer_number: 4 }, { rules: { max: 5 } })).toBe(
        '4 / 5 ★',
      );
    });

    it('formats boolean answers as Yes / No', () => {
      expect(formatAnswerValue('boolean', { answer_boolean: true })).toBe('Yes');
      expect(formatAnswerValue('boolean', { answer_boolean: false })).toBe('No');
    });

    it('formats multi_select array values', () => {
      expect(
        formatAnswerValue(
          'multi_select',
          {
            answer_json: ['opt1', 'opt2'],
          },
          {
            options: [
              { label: 'Option 1', value: 'opt1' },
              { label: 'Option 2', value: 'opt2' },
            ],
          },
        ),
      ).toBe('Option 1, Option 2');
    });

    it('returns — for empty answers', () => {
      expect(formatAnswerValue('text', {})).toBe('—');
    });
  });
});
