import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { QUERY_KEYS } from '@/config/constants';
import { useUpsertAttendanceAnswersMutation } from '@/hooks/domain/attendance/mutations/useUpsertAttendanceAnswersMutation';

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    delete: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    upsert: vi.fn(),
  };

  queryBuilder.delete.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.in.mockReturnValue(queryBuilder);

  return {
    mockQueryBuilder: queryBuilder,
    mockFrom: vi.fn(() => queryBuilder),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    supabase: {
      from: mockFrom,
    },
  };
});

describe('useUpsertAttendanceAnswersMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain returns - use queryBuilder ref instead of mockQueryBuilder to create proper reference
    const qb = mockQueryBuilder;
    qb.delete.mockReturnValue(qb);
    qb.eq.mockReturnValue(qb);
    qb.in.mockReturnValue(qb);
  });

  it('upserts answers with text values only', async () => {
    mockQueryBuilder.upsert.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useUpsertAttendanceAnswersMutation());

    const input = {
      event_id: 'event-1',
      registration_id: 'reg-1',
      answers: [
        { attendance_field_id: 'field-1', answer_text: 'Answer 1', answer_number: undefined },
        { attendance_field_id: 'field-2', answer_text: 'Answer 2', answer_number: undefined },
      ],
    };

    const response = await act(async () => result.current.mutateAsync(input));

    expect(response).toBe(2);
    expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          registration_id: 'reg-1',
          attendance_field_id: 'field-1',
          answer_text: 'Answer 1',
          answer_number: null,
        }),
        expect.objectContaining({
          registration_id: 'reg-1',
          attendance_field_id: 'field-2',
          answer_text: 'Answer 2',
          answer_number: null,
        }),
      ]),
      {
        onConflict: 'registration_id,attendance_field_id',
        ignoreDuplicates: false,
      },
    );
  });

  it('upserts answers with number values only', async () => {
    mockQueryBuilder.upsert.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useUpsertAttendanceAnswersMutation());

    const input = {
      event_id: 'event-1',
      registration_id: 'reg-1',
      answers: [
        { attendance_field_id: 'field-1', answer_text: undefined, answer_number: 42 },
        { attendance_field_id: 'field-2', answer_text: undefined, answer_number: 100 },
      ],
    };

    const response = await act(async () => result.current.mutateAsync(input));

    expect(response).toBe(2);
    expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          attendance_field_id: 'field-1',
          answer_number: 42,
          answer_text: null,
        }),
        expect.objectContaining({
          attendance_field_id: 'field-2',
          answer_number: 100,
          answer_text: null,
        }),
      ]),
      expect.any(Object),
    );
  });

  it('trims whitespace from text answers', async () => {
    mockQueryBuilder.upsert.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useUpsertAttendanceAnswersMutation());

    const input = {
      event_id: 'event-1',
      registration_id: 'reg-1',
      answers: [
        {
          attendance_field_id: 'field-1',
          answer_text: '  Answer with spaces  ',
          answer_number: undefined,
        },
      ],
    };

    await act(async () => result.current.mutateAsync(input));

    expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          answer_text: 'Answer with spaces',
        }),
      ]),
      expect.any(Object),
    );
  });

  it('filters out blank text answers and deletes them from database', async () => {
    mockQueryBuilder.upsert.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useUpsertAttendanceAnswersMutation());

    const input = {
      event_id: 'event-1',
      registration_id: 'reg-1',
      answers: [
        { attendance_field_id: 'field-1', answer_text: 'Valid answer', answer_number: undefined },
        { attendance_field_id: 'field-2', answer_text: '   ', answer_number: undefined },
      ],
    };

    const response = await act(async () => result.current.mutateAsync(input));

    expect(response).toBe(1);
    expect(mockQueryBuilder.delete).toHaveBeenCalled();
  });

  it('handles all blank answers by deleting them', async () => {
    mockQueryBuilder.upsert.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useUpsertAttendanceAnswersMutation());

    const input = {
      event_id: 'event-1',
      registration_id: 'reg-1',
      answers: [
        { attendance_field_id: 'field-1', answer_text: '', answer_number: undefined },
        { attendance_field_id: 'field-2', answer_text: '  ', answer_number: undefined },
      ],
    };

    const response = await act(async () => result.current.mutateAsync(input));

    expect(response).toBe(0);
    expect(mockQueryBuilder.delete).toHaveBeenCalled();
    expect(mockQueryBuilder.in).toHaveBeenCalledWith('attendance_field_id', ['field-1', 'field-2']);
  });

  it('does not delete when all answers have values', async () => {
    mockQueryBuilder.upsert.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useUpsertAttendanceAnswersMutation());

    const input = {
      event_id: 'event-1',
      registration_id: 'reg-1',
      answers: [
        { attendance_field_id: 'field-1', answer_text: 'Answer', answer_number: undefined },
        { attendance_field_id: 'field-2', answer_text: 'Another', answer_number: undefined },
      ],
    };

    await act(async () => result.current.mutateAsync(input));

    expect(mockQueryBuilder.delete).not.toHaveBeenCalled();
    expect(mockQueryBuilder.upsert).toHaveBeenCalled();
  });

  it('generates unique IDs for each answer', async () => {
    mockQueryBuilder.upsert.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useUpsertAttendanceAnswersMutation());

    const input = {
      event_id: 'event-1',
      registration_id: 'reg-1',
      answers: [
        { attendance_field_id: 'field-1', answer_text: 'Answer 1', answer_number: undefined },
        { attendance_field_id: 'field-2', answer_text: 'Answer 2', answer_number: undefined },
      ],
    };

    await act(async () => result.current.mutateAsync(input));

    const callArgs = mockQueryBuilder.upsert.mock.calls[0][0];
    const ids = callArgs.map((row: { id: string }) => row.id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('preserves registration_id for all answers', async () => {
    mockQueryBuilder.upsert.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useUpsertAttendanceAnswersMutation());

    const input = {
      event_id: 'event-1',
      registration_id: 'reg-123',
      answers: [
        { attendance_field_id: 'field-1', answer_text: 'A', answer_number: undefined },
        { attendance_field_id: 'field-2', answer_text: 'B', answer_number: undefined },
      ],
    };

    await act(async () => result.current.mutateAsync(input));

    const callArgs = mockQueryBuilder.upsert.mock.calls[0][0];
    callArgs.forEach((row: { registration_id: string }) => {
      expect(row.registration_id).toBe('reg-123');
    });
  });

  it('handles mixed text and number answers', async () => {
    mockQueryBuilder.upsert.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useUpsertAttendanceAnswersMutation());

    const input = {
      event_id: 'event-1',
      registration_id: 'reg-1',
      answers: [
        { attendance_field_id: 'field-1', answer_text: 'Text answer', answer_number: undefined },
        { attendance_field_id: 'field-2', answer_text: undefined, answer_number: 99 },
      ],
    };

    const response = await act(async () => result.current.mutateAsync(input));

    expect(response).toBe(2);
    expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          attendance_field_id: 'field-1',
          answer_text: 'Text answer',
          answer_number: null,
        }),
        expect.objectContaining({
          attendance_field_id: 'field-2',
          answer_text: null,
          answer_number: 99,
        }),
      ]),
      expect.any(Object),
    );
  });

  it('invalidates query with correct event_id', async () => {
    mockQueryBuilder.upsert.mockResolvedValueOnce({ data: null, error: null });

    const { result, queryClient } = renderHookWithClient(() =>
      useUpsertAttendanceAnswersMutation(),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const input = {
      event_id: 'event-xyz',
      registration_id: 'reg-1',
      answers: [
        { attendance_field_id: 'field-1', answer_text: 'Answer', answer_number: undefined },
      ],
    };

    await act(async () => result.current.mutateAsync(input));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.adminAttendanceAnswers('event-xyz'),
      });
    });
  });

  it('handles zero number value correctly', async () => {
    mockQueryBuilder.upsert.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useUpsertAttendanceAnswersMutation());

    const input = {
      event_id: 'event-1',
      registration_id: 'reg-1',
      answers: [{ attendance_field_id: 'field-1', answer_text: undefined, answer_number: 0 }],
    };

    const response = await act(async () => result.current.mutateAsync(input));

    expect(response).toBe(1);
    expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          answer_number: 0,
          answer_text: null,
        }),
      ]),
      expect.any(Object),
    );
  });

  it('correctly identifies which answers are blank vs filled', async () => {
    mockQueryBuilder.upsert.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useUpsertAttendanceAnswersMutation());

    const input = {
      event_id: 'event-1',
      registration_id: 'reg-1',
      answers: [
        { attendance_field_id: 'field-1', answer_text: 'Filled', answer_number: undefined },
        { attendance_field_id: 'field-2', answer_text: '', answer_number: undefined },
        { attendance_field_id: 'field-3', answer_text: undefined, answer_number: 5 },
        { attendance_field_id: 'field-4', answer_text: undefined, answer_number: undefined },
      ],
    };

    const response = await act(async () => result.current.mutateAsync(input));

    expect(response).toBe(2);

    expect(mockQueryBuilder.in).toHaveBeenCalledWith('attendance_field_id', ['field-2', 'field-4']);

    expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ attendance_field_id: 'field-1', answer_text: 'Filled' }),
        expect.objectContaining({ attendance_field_id: 'field-3', answer_number: 5 }),
      ]),
      expect.any(Object),
    );
  });

  it('throws when blank-answer delete fails', async () => {
    const deleteError = new Error('Delete failed');
    mockQueryBuilder.in.mockResolvedValueOnce({ error: deleteError });

    const { result } = renderHookWithClient(() => useUpsertAttendanceAnswersMutation());

    const input = {
      event_id: 'event-1',
      registration_id: 'reg-1',
      answers: [{ attendance_field_id: 'field-1', answer_text: '', answer_number: undefined }],
    };

    await expect(act(async () => result.current.mutateAsync(input))).rejects.toThrow(
      'Delete failed',
    );
  });
});
