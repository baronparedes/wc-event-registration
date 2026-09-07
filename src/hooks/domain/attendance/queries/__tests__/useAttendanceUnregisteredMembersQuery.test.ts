import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAttendanceUnregisteredMembersQuery } from '@/hooks/domain/attendance/queries/useAttendanceUnregisteredMembersQuery';

const { mockCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const caller = vi.fn();

  return {
    mockCaller: caller,
    mockCreateEdgeFunctionCaller: vi.fn(() => caller),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
  };
});

describe('useAttendanceUnregisteredMembersQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty page result without calling edge function when event ID is missing', async () => {
    const { result } = renderHookWithClient(() =>
      useAttendanceUnregisteredMembersQuery(undefined, {
        pageSize: 20,
        cursor: null,
      }),
    );

    await act(async () => {
      const refetchResult = await result.current.refetch();
      expect(refetchResult.data).toEqual({
        items: [],
        nextCursor: null,
        hasMore: false,
        totalCount: 0,
        totalPages: 1,
      });
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockCaller).not.toHaveBeenCalled();
  });

  it('loads unregistered members and maps pagination metadata', async () => {
    mockCaller.mockResolvedValueOnce({
      success: true,
      items: [
        {
          user_id: 'user-1',
          member_id: 'WC-101',
          full_name: 'Alex Rivera',
          email: 'alex@example.com',
          role: 'attendee',
          category: 'participant',
        },
      ],
      total_count: 21,
      has_more: true,
      next_cursor: '20',
    });

    const { result } = renderHookWithClient(() =>
      useAttendanceUnregisteredMembersQuery('event-1', {
        pageSize: 20,
        cursor: null,
        searchTerm: ' Alex ',
      }),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('list-unregistered-members');
    expect(mockCaller).toHaveBeenCalledWith({
      event_id: 'event-1',
      page_size: 20,
      offset: 0,
      search_term: 'Alex',
    });
    expect(result.current.data).toEqual({
      items: [
        {
          user_id: 'user-1',
          member_id: 'WC-101',
          full_name: 'Alex Rivera',
          email: 'alex@example.com',
          role: 'attendee',
          category: 'participant',
        },
      ],
      totalCount: 21,
      totalPages: 2,
      hasMore: true,
      nextCursor: '20',
    });
  });

  it('surfaces edge function errors', async () => {
    mockCaller.mockResolvedValueOnce({
      success: false,
      error: 'Forbidden',
      error_code: 'FORBIDDEN',
    });

    const { result } = renderHookWithClient(() =>
      useAttendanceUnregisteredMembersQuery('event-1', {
        pageSize: 20,
        cursor: null,
      }),
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Forbidden'));
  });

  it('uses fallback error text when edge function omits an error message', async () => {
    mockCaller.mockResolvedValueOnce({
      success: false,
    });

    const { result } = renderHookWithClient(() =>
      useAttendanceUnregisteredMembersQuery('event-1', {
        pageSize: 20,
        cursor: null,
      }),
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Failed to load unregistered members report.'));
  });
});
