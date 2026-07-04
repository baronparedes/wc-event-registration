import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { QUERY_KEYS } from '@/config/constants';
import { useReorderAttendanceFieldsMutation } from '@/hooks/domain/attendance-fields/mutations/useReorderAttendanceFieldsMutation';

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    update: vi.fn(),
    eq: vi.fn(),
  };

  queryBuilder.update.mockReturnValue(queryBuilder);
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

describe('useReorderAttendanceFieldsMutation', () => {
  let eqCallCount = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    eqCallCount = 0;
    const qb = mockQueryBuilder;

    // For chained calls, return queryBuilder to allow continued chaining
    qb.update.mockReturnValue(qb);

    // eq() needs to return queryBuilder for continued chaining, until it's the final call
    // Since Promise.all calls have multiple eq() per update, we track call count
    qb.eq.mockImplementation(() => {
      eqCallCount++;
      // Every 2nd eq call is terminal (last filter in chain), so return Promise
      if (eqCallCount % 2 === 0) {
        // Return object with {data, error} like Supabase does
        return Promise.resolve({ data: null, error: null });
      }
      // Odd calls: return queryBuilder for continued chaining
      return qb;
    });
  });

  it('updates display_order for all fields', async () => {
    const { result } = renderHookWithClient(() => useReorderAttendanceFieldsMutation());

    const input = {
      event_id: 'event-1',
      orderedIds: ['field-1', 'field-2', 'field-3'],
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.update).toHaveBeenCalledTimes(3);
    expect(mockQueryBuilder.update).toHaveBeenNthCalledWith(1, { display_order: 0 });
    expect(mockQueryBuilder.update).toHaveBeenNthCalledWith(2, { display_order: 1 });
    expect(mockQueryBuilder.update).toHaveBeenNthCalledWith(3, { display_order: 2 });
  });

  it('uses ordinal index as display_order', async () => {
    const { result } = renderHookWithClient(() => useReorderAttendanceFieldsMutation());

    const input = {
      event_id: 'event-1',
      orderedIds: ['field-a', 'field-b', 'field-c', 'field-d', 'field-e'],
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.update).toHaveBeenCalledWith({ display_order: 0 });
    expect(mockQueryBuilder.update).toHaveBeenCalledWith({ display_order: 1 });
    expect(mockQueryBuilder.update).toHaveBeenCalledWith({ display_order: 2 });
    expect(mockQueryBuilder.update).toHaveBeenCalledWith({ display_order: 3 });
    expect(mockQueryBuilder.update).toHaveBeenCalledWith({ display_order: 4 });
  });

  it('filters by both id and event_id for each update', async () => {
    const { result } = renderHookWithClient(() => useReorderAttendanceFieldsMutation());

    const input = {
      event_id: 'event-1',
      orderedIds: ['field-1', 'field-2'],
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const eqCalls = mockQueryBuilder.eq.mock.calls;

    expect(eqCalls).toContainEqual(['id', 'field-1']);
    expect(eqCalls).toContainEqual(['event_id', 'event-1']);
    expect(eqCalls).toContainEqual(['id', 'field-2']);
    expect(eqCalls).toContainEqual(['event_id', 'event-1']);
  });

  it('invalidates fields query after reordering', async () => {
    const { result, queryClient } = renderHookWithClient(() =>
      useReorderAttendanceFieldsMutation(),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const input = {
      event_id: 'event-1',
      orderedIds: ['field-1', 'field-2', 'field-3'],
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.adminAttendanceFields('event-1'),
      });
    });
  });

  it('handles single field reorder', async () => {
    const { result } = renderHookWithClient(() => useReorderAttendanceFieldsMutation());

    const input = {
      event_id: 'event-1',
      orderedIds: ['field-1'],
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.update).toHaveBeenCalledTimes(1);
    expect(mockQueryBuilder.update).toHaveBeenCalledWith({ display_order: 0 });
  });

  it('handles empty orderedIds array', async () => {
    const { result } = renderHookWithClient(() => useReorderAttendanceFieldsMutation());

    const input = {
      event_id: 'event-1',
      orderedIds: [],
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.update).not.toHaveBeenCalled();
  });

  it('handles large number of fields', async () => {
    const { result } = renderHookWithClient(() => useReorderAttendanceFieldsMutation());

    const orderedIds = Array.from({ length: 50 }, (_, i) => `field-${i}`);

    const input = {
      event_id: 'event-1',
      orderedIds,
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQueryBuilder.update).toHaveBeenCalledTimes(50);

    for (let i = 0; i < 50; i++) {
      expect(mockQueryBuilder.update).toHaveBeenNthCalledWith(i + 1, { display_order: i });
    }
  });

  it('handles error when update fails', async () => {
    // Override eq to return error on even calls
    mockQueryBuilder.eq.mockImplementation(() => {
      eqCallCount++;
      if (eqCallCount % 2 === 0) {
        return Promise.resolve({ data: null, error: new Error('Update failed') });
      }
      return mockQueryBuilder;
    });

    const { result } = renderHookWithClient(() => useReorderAttendanceFieldsMutation());

    const input = {
      event_id: 'event-1',
      orderedIds: ['field-1', 'field-2'],
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('Update failed');
  });

  it('awaits all promise updates before completing', async () => {
    const { result } = renderHookWithClient(() => useReorderAttendanceFieldsMutation());

    const input = {
      event_id: 'event-1',
      orderedIds: ['field-1', 'field-2', 'field-3'],
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // All 6 eq calls (2 per field) should have been made
    expect(mockQueryBuilder.eq).toHaveBeenCalledTimes(6);
  });

  it('preserves field IDs when reordering', async () => {
    const { result } = renderHookWithClient(() => useReorderAttendanceFieldsMutation());

    const fieldIds = ['field-xyz', 'field-abc', 'field-def'];

    const input = {
      event_id: 'event-1',
      orderedIds: fieldIds,
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const idCalls = mockQueryBuilder.eq.mock.calls.filter((call) => call[0] === 'id');

    expect(idCalls).toContainEqual(['id', 'field-xyz']);
    expect(idCalls).toContainEqual(['id', 'field-abc']);
    expect(idCalls).toContainEqual(['id', 'field-def']);
  });

  it('uses correct event_id for all updates', async () => {
    const { result } = renderHookWithClient(() => useReorderAttendanceFieldsMutation());

    const input = {
      event_id: 'event-specific-123',
      orderedIds: ['field-1', 'field-2'],
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const eventIdCalls = mockQueryBuilder.eq.mock.calls.filter((call) => call[0] === 'event_id');

    expect(eventIdCalls).toHaveLength(2);
    expect(eventIdCalls[0]).toEqual(['event_id', 'event-specific-123']);
    expect(eventIdCalls[1]).toEqual(['event_id', 'event-specific-123']);
  });

  it('returns void on success', async () => {
    const { result } = renderHookWithClient(() => useReorderAttendanceFieldsMutation());

    const input = {
      event_id: 'event-1',
      orderedIds: ['field-1', 'field-2'],
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeUndefined();
  });
});
