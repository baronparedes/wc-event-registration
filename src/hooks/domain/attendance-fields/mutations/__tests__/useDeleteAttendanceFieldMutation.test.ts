import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { QUERY_KEYS } from '@/config/constants';
import { useDeleteAttendanceFieldMutation } from '@/hooks/domain/attendance-fields/mutations/useDeleteAttendanceFieldMutation';

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    delete: vi.fn(),
    eq: vi.fn(),
  };

  queryBuilder.delete.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);

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

describe('useDeleteAttendanceFieldMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const qb = mockQueryBuilder;
    qb.delete.mockReturnValue(qb);
    qb.eq.mockReturnValue(qb);
  });

  it('deletes the field from database', async () => {
    mockQueryBuilder.eq.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result } = renderHookWithClient(() => useDeleteAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'event-1',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.delete).toHaveBeenCalled();
  });

  it('filters by both id and event_id', async () => {
    mockQueryBuilder.eq.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result } = renderHookWithClient(() => useDeleteAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'event-1',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const eqCalls = mockQueryBuilder.eq.mock.calls;
    expect(eqCalls).toContainEqual(['id', 'field-1']);
    expect(eqCalls).toContainEqual(['event_id', 'event-1']);
  });

  it('invalidates attendance fields query', async () => {
    mockQueryBuilder.eq.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result, queryClient } = renderHookWithClient(() => useDeleteAttendanceFieldMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const input = {
      id: 'field-1',
      event_id: 'event-1',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.adminAttendanceFields('event-1'),
      });
    });
  });

  it('invalidates attendance answers query', async () => {
    mockQueryBuilder.eq.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result, queryClient } = renderHookWithClient(() => useDeleteAttendanceFieldMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const input = {
      id: 'field-1',
      event_id: 'event-xyz',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.adminAttendanceAnswers('event-xyz'),
      });
    });
  });

  it('invalidates both queries when deletion succeeds', async () => {
    mockQueryBuilder.eq.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result, queryClient } = renderHookWithClient(() => useDeleteAttendanceFieldMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const input = {
      id: 'field-1',
      event_id: 'event-1',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenNthCalledWith(1, {
        queryKey: QUERY_KEYS.adminAttendanceFields('event-1'),
      });

      expect(invalidateSpy).toHaveBeenNthCalledWith(2, {
        queryKey: QUERY_KEYS.adminAttendanceAnswers('event-1'),
      });
    });
  });

  it('throws error when delete fails', async () => {
    const error = new Error('Delete failed');
    mockQueryBuilder.eq.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error,
    });

    const { result } = renderHookWithClient(() => useDeleteAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'event-1',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('handles different field IDs', async () => {
    mockQueryBuilder.eq.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result } = renderHookWithClient(() => useDeleteAttendanceFieldMutation());

    const input = {
      id: 'different-field-id',
      event_id: 'event-1',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'different-field-id');
  });

  it('handles different event IDs', async () => {
    mockQueryBuilder.eq.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result } = renderHookWithClient(() => useDeleteAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'different-event-id',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('event_id', 'different-event-id');
  });

  it('returns void on success', async () => {
    mockQueryBuilder.eq.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result } = renderHookWithClient(() => useDeleteAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'event-1',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeUndefined();
  });

  it('cascades deletion of related attendance answers', async () => {
    mockQueryBuilder.eq.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result, queryClient } = renderHookWithClient(() => useDeleteAttendanceFieldMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const input = {
      id: 'field-1',
      event_id: 'event-1',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify both fields and answers are invalidated (cascade cleanup)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.adminAttendanceFields('event-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.adminAttendanceAnswers('event-1'),
    });
  });
});
