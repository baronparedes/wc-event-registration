import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { QUERY_KEYS } from '@/config/constants';
import { useReorderAttendanceFieldsMutation } from '@/hooks/domain/attendance-fields/mutations/useReorderAttendanceFieldsMutation';

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    supabase: {
      rpc: mockRpc,
    },
  };
});

describe('useReorderAttendanceFieldsMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it('calls rpc with correctly formatted parameters', async () => {
    const { result } = renderHookWithClient(() => useReorderAttendanceFieldsMutation());

    const input = {
      event_id: 'event-1',
      orderedIds: ['field-1', 'field-2', 'field-3'],
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('reorder_attendance_fields', {
      p_event_id: 'event-1',
      p_ordered_ids: ['field-1', 'field-2', 'field-3'],
    });
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

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('reorder_attendance_fields', {
      p_event_id: 'event-1',
      p_ordered_ids: ['field-1'],
    });
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

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('reorder_attendance_fields', {
      p_event_id: 'event-1',
      p_ordered_ids: [],
    });
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

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('reorder_attendance_fields', {
      p_event_id: 'event-1',
      p_ordered_ids: orderedIds,
    });
  });

  it('handles error when rpc fails', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('Update failed') });

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
