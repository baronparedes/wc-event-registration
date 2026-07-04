import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFieldAnswerTextFormatter } from '@/hooks/utils/useFieldAnswerTextFormatter';

describe('useFieldAnswerTextFormatter', () => {
  it('returns em dash when answer is empty', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(result.current.getAnswerText('text', { answer_text: null, answer_number: null })).toBe(
      '—',
    );
  });

  it('renders numeric answers as text', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(result.current.getAnswerText('number', { answer_text: null, answer_number: 42 })).toBe(
      '42',
    );
  });

  it('renders boolean field values to Yes and No', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('boolean', { answer_text: 'true', answer_number: null }),
    ).toBe('Yes');

    expect(
      result.current.getAnswerText('boolean', { answer_text: 'false', answer_number: null }),
    ).toBe('No');
  });

  it('falls back to raw text for non-boolean boolean-field values', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('boolean', { answer_text: 'maybe', answer_number: null }),
    ).toBe('maybe');
  });

  it('renders multi_select_toggle values as label and yes/no text', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('multi_select_toggle', {
        answer_text: '{"Dietary": true, "Transport": false}',
        answer_number: null,
      }),
    ).toBe('Dietary (Yes), Transport (No)');
  });

  it('falls back to text model for invalid multi_select_toggle objects', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('multi_select_toggle', {
        answer_text: '{"Dietary": "sometimes"}',
        answer_number: null,
      }),
    ).toBe('Dietary: sometimes');
  });

  it('renders radio, checkbox, and multi_select objects as selected key labels', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('multi_select', {
        answer_text: '{"Morning": true, "Afternoon": false, "Evening": true}',
        answer_number: null,
      }),
    ).toBe('Morning, Evening');

    expect(
      result.current.getAnswerText('radio', {
        answer_text: '{"1": true, "2": false, "3": true}',
        answer_number: null,
      }),
    ).toBe('1, 3');

    expect(
      result.current.getAnswerText('checkbox', {
        answer_text: '{"9AM":true,"3 PM":true,"12 NN":true}',
        answer_number: null,
      }),
    ).toBe('9AM, 3 PM, 12 NN');
  });

  it('supports boolean-map payloads wrapped in a single array item', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('checkbox', {
        answer_text: '[{"Morning":true,"Afternoon":false}]',
        answer_number: null,
      }),
    ).toBe('Morning');
  });

  it('preserves plain string values for choice fields', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('radio', {
        answer_text: 'Window Seat',
        answer_number: null,
      }),
    ).toBe('Window Seat');
  });

  it('renders parsed arrays as comma-separated values and empty arrays as em dash', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('text', { answer_text: '["A", "B", "C"]', answer_number: null }),
    ).toBe('A, B, C');

    expect(result.current.getAnswerText('text', { answer_text: '[]', answer_number: null })).toBe(
      '—',
    );
  });

  it('renders mixed array values without falling back to object text', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('text', {
        answer_text: '[null,true,2]',
        answer_number: null,
      }),
    ).toBe('—, true, 2');
  });

  it('renders generic objects while filtering empty values', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('text', {
        answer_text: '{"Role": "Leader", "Notes": "", "Visible": false, "Count": 3}',
        answer_number: null,
      }),
    ).toBe('Role: Leader, Count: 3');
  });

  it('returns em dash for objects without non-empty values', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('text', {
        answer_text: '{"A": "", "B": false, "C": null}',
        answer_number: null,
      }),
    ).toBe('—');
  });

  it('keeps numeric zero values when rendering generic objects', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('text', {
        answer_text: '{"Count":0,"Visible":false,"Label":""}',
        answer_number: null,
      }),
    ).toBe('Count: 0');
  });

  it('returns em dash for checkbox payloads where no boolean-map entries are selected', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('checkbox', {
        answer_text: '{"Morning":false,"Afternoon":false}',
        answer_number: null,
      }),
    ).toBe('—');
  });

  it('falls back to raw answer_text when JSON parsing fails', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('text', { answer_text: '{not json', answer_number: null }),
    ).toBe('{not json');
  });

  it('returns em dash for whitespace-only text', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(result.current.getAnswerText('text', { answer_text: '   ', answer_number: null })).toBe(
      '—',
    );
  });

  it('returns em dash for nested empty stringified JSON values', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('text', { answer_text: '"   "', answer_number: null }),
    ).toBe('—');
  });

  it('supports fallback boolean/date/json answer columns', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('boolean', {
        answer_text: null,
        answer_number: null,
        answer_boolean: false,
      }),
    ).toBe('No');

    expect(
      result.current.getAnswerText('date', {
        answer_text: null,
        answer_number: null,
        answer_date: '2026-07-05',
      }),
    ).toBe('2026-07-05');

    expect(
      result.current.getAnswerText('multi_select', {
        answer_text: null,
        answer_number: null,
        answer_json: { Morning: true, Evening: true, Afternoon: false },
      }),
    ).toBe('Morning, Evening');
  });

  it('renders nested object values without [object Object]', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('text', {
        answer_text: '{"Assignment":{"team":"Blue","table":12},"Present":true}',
        answer_number: null,
      }),
    ).toBe('Assignment: {"team":"Blue","table":12}, Present: true');
  });

  it('renders arrays with object items without [object Object]', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('text', {
        answer_text: '[{"name":"Music"},{"name":"Kids"}]',
        answer_number: null,
      }),
    ).toBe('{"name":"Music"}, {"name":"Kids"}');
  });

  it('decodes nested stringified JSON and preserves multi_select_toggle kind', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('multi_select_toggle', {
        answer_text: '"{\\"9AM\\":true,\\"3 PM\\":true,\\"12 NN\\":true}"',
        answer_number: null,
      }),
    ).toBe('9AM (Yes), 3 PM (Yes), 12 NN (Yes)');
  });

  it('decodes escaped JSON object strings for checkbox-style payloads', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerText('checkbox', {
        answer_text: '{\\"9AM\\":true,\\"3 PM\\":true,\\"12 NN\\":true}',
        answer_number: null,
      }),
    ).toBe('9AM, 3 PM, 12 NN');
  });
});
