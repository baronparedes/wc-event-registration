import { act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { QUERY_KEYS } from '@/config/constants';
import { useQueuedCheckInAttendeeMutation } from '@/hooks/domain/attendance/mutations/useQueuedCheckInAttendeeMutation';

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

describe('useQueuedCheckInAttendeeMutation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('queues a check-in immediately and drains it in the background', async () => {
    mockCaller.mockResolvedValueOnce({
      success: true,
      result: {
        success: true,
        status: 'checked_in',
        official_check_in_time: '2026-07-25T02:00:00.000Z',
        attendee_kind: 'registered',
        message: 'Checked in',
      },
    });

    const updateAttendee = vi.fn();
    const refreshCache = vi.fn();

    const { result, queryClient } = renderHookWithClient(() =>
      useQueuedCheckInAttendeeMutation('event-1', { refreshCache, updateAttendee }),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    let outcome = { queued: false };

    act(() => {
      outcome = result.current.enqueueCheckIn(
        {
          event_id: 'event-1',
          attendee_kind: 'registered',
          registration_id: 'registration-1',
        },
        'registration-1',
      );
    });

    expect(outcome.queued).toBe(true);
    expect(updateAttendee).toHaveBeenCalledWith('registration-1', {
      check_in_status: 'checked_in',
      official_check_in_time: expect.any(String),
    });

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(0);
    });

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('check-in-attendee');
    expect(mockCaller).toHaveBeenCalledWith({
      event_id: 'event-1',
      attendee_kind: 'registered',
      registration_id: 'registration-1',
    });
    expect(updateAttendee).toHaveBeenLastCalledWith('registration-1', {
      check_in_status: 'checked_in',
      official_check_in_time: '2026-07-25T02:00:00.000Z',
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['admin-attendance-search', 'event-1'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.adminAttendanceAnswers('event-1'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.adminAttendanceSlotSummaries('event-1'),
      });
    });
  });

  it('keeps a transient failure queued for retry and restores it from storage', async () => {
    mockCaller.mockRejectedValueOnce(new Error('Failed to fetch'));

    const updateAttendee = vi.fn();
    const refreshCache = vi.fn();

    const firstRender = renderHookWithClient(() =>
      useQueuedCheckInAttendeeMutation('event-2', { refreshCache, updateAttendee }),
    );

    act(() => {
      firstRender.result.current.enqueueCheckIn(
        {
          event_id: 'event-2',
          attendee_kind: 'registered',
          registration_id: 'registration-2',
        },
        'registration-2',
      );
    });

    await waitFor(() => {
      expect(firstRender.result.current.pendingCount).toBe(1);
    });

    await waitFor(() => {
      expect(firstRender.result.current.lastError).toBe('Failed to fetch');
    });
    expect(updateAttendee).toHaveBeenCalledWith('registration-2', {
      check_in_status: 'checked_in',
      official_check_in_time: expect.any(String),
    });

    firstRender.unmount();

    const secondRender = renderHookWithClient(() =>
      useQueuedCheckInAttendeeMutation('event-2', { refreshCache, updateAttendee }),
    );

    await waitFor(() => {
      expect(secondRender.result.current.pendingCount).toBe(1);
    });

    await waitFor(() => {
      expect(secondRender.result.current.lastError).toBe('Failed to fetch');
    });
  });
});
