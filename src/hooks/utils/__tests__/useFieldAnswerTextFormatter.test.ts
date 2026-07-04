import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFieldAnswerTextFormatter } from '@/hooks/utils/useFieldAnswerTextFormatter';

describe('useFieldAnswerTextFormatter', () => {
  it('returns em dash when answer is empty', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerDisplayModel('text', {
        answer_text: null,
        answer_number: null,
      }),
    ).toEqual({ kind: 'text', text: '—' });
  });

  it('renders numeric answers as text', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerDisplayModel('number', {
        answer_text: null,
        answer_number: 42,
      }),
    ).toEqual({ kind: 'text', text: '42' });
  });

  it('renders boolean field values to Yes and No', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerDisplayModel('boolean', {
        answer_text: 'true',
        answer_number: null,
      }),
    ).toEqual({ kind: 'text', text: 'Yes' });

    expect(
      result.current.getAnswerDisplayModel('boolean', {
        answer_text: 'false',
        answer_number: null,
      }),
    ).toEqual({ kind: 'text', text: 'No' });
  });

  it('renders multi_select_toggle as toggle display entries', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerDisplayModel('multi_select_toggle', {
        answer_text: '{"Dietary": true, "Transport": false}',
        answer_number: null,
      }),
    ).toEqual({
      kind: 'toggle',
      entries: [
        { label: 'Dietary', valueLabel: 'Yes' },
        { label: 'Transport', valueLabel: 'No' },
      ],
    });
  });

  it('falls back to text model for invalid multi_select_toggle objects', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerDisplayModel('multi_select_toggle', {
        answer_text: '{"Dietary": "sometimes"}',
        answer_number: null,
      }),
    ).toEqual({ kind: 'text', text: 'Dietary: sometimes' });
  });

  it('renders multi_select objects as selected key labels', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerDisplayModel('multi_select', {
        answer_text: '{"Morning": true, "Afternoon": false, "Evening": true}',
        answer_number: null,
      }),
    ).toEqual({ kind: 'text', text: 'Morning, Evening' });
  });

  it('renders parsed arrays as comma-separated values and empty arrays as em dash', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerDisplayModel('text', {
        answer_text: '["A", "B", "C"]',
        answer_number: null,
      }),
    ).toEqual({ kind: 'text', text: 'A, B, C' });

    expect(
      result.current.getAnswerDisplayModel('text', {
        answer_text: '[]',
        answer_number: null,
      }),
    ).toEqual({ kind: 'text', text: '—' });
  });

  it('renders generic objects while filtering empty values', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerDisplayModel('text', {
        answer_text: '{"Role": "Leader", "Notes": "", "Visible": false, "Count": 3}',
        answer_number: null,
      }),
    ).toEqual({ kind: 'text', text: 'Role: Leader, Count: 3' });
  });

  it('returns em dash for objects without non-empty values', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerDisplayModel('text', {
        answer_text: '{"A": "", "B": false, "C": null}',
        answer_number: null,
      }),
    ).toEqual({ kind: 'text', text: '—' });
  });

  it('falls back to raw answer_text when JSON parsing fails', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerDisplayModel('text', {
        answer_text: '{not json',
        answer_number: null,
      }),
    ).toEqual({ kind: 'text', text: '{not json' });
  });

  it('returns em dash for whitespace-only text', () => {
    const { result } = renderHook(() => useFieldAnswerTextFormatter());

    expect(
      result.current.getAnswerDisplayModel('text', {
        answer_text: '   ',
        answer_number: null,
      }),
    ).toEqual({ kind: 'text', text: '—' });
  });
});
