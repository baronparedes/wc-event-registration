import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useSearchAttendeesQuery } from '@/hooks/domain/attendance/queries/useSearchAttendeesQuery';

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

describe('useSearchAttendeesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty result without calling the edge function when event id is missing', async () => {
    const { result } = renderHookWithClient(() => useSearchAttendeesQuery(undefined, 'WC-001'));

    await act(async () => {
      const refetchResult = await result.current.refetch();
      expect(refetchResult.data).toEqual([]);
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockCaller).not.toHaveBeenCalled();
  });

  it('returns an empty result without calling the edge function when the search token is blank', async () => {
    const { result } = renderHookWithClient(() => useSearchAttendeesQuery('event-1', '   '));

    await act(async () => {
      const refetchResult = await result.current.refetch();
      expect(refetchResult.data).toEqual([]);
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockCaller).not.toHaveBeenCalled();
  });

  it('trims the search token and returns attendee results', async () => {
    const results = [
      {
        attendee_kind: 'public' as const,
        registration_id: 'registration-1',
        public_registration_id: 'public-registration-1',
        user_id: null,
        member_id: 'Guest',
        full_name: 'Guest Person',
        email: 'guest@example.com',
        role: null,
        category: null,
        registration_status: 'submitted' as const,
        submitted_at: '2026-07-05T02:00:00.000Z',
        check_in_status: 'not_checked_in' as const,
        official_check_in_time: null,
        registration_answers: [],
        attendance_answers: [],
      },
    ];

    mockCaller.mockResolvedValueOnce({
      success: true,
      results,
    });

    const { result } = renderHookWithClient(() => useSearchAttendeesQuery('event-1', '  guest '));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('search-attendees');
    expect(mockCaller).toHaveBeenCalledWith({
      event_id: 'event-1',
      search_token: 'guest',
    });
    expect(result.current.data).toEqual(results);
  });

  it('surfaces the edge function error message when lookup fails', async () => {
    mockCaller.mockResolvedValueOnce({
      success: false,
      error: 'Lookup failed',
      error_code: 'LOOKUP_FAILED',
    });

    const { result } = renderHookWithClient(() => useSearchAttendeesQuery('event-1', 'guest'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Lookup failed'));
  });

  it('uses the fallback error message when the edge function omits one', async () => {
    mockCaller.mockResolvedValueOnce({
      success: false,
    });

    const { result } = renderHookWithClient(() => useSearchAttendeesQuery('event-1', 'guest'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Failed to search attendees.'));
  });
});
