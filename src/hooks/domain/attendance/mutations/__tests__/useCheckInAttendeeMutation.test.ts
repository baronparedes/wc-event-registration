import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { QUERY_KEYS } from '@/config/constants';
import { useCheckInAttendeeMutation } from '@/hooks/domain/attendance/mutations/useCheckInAttendeeMutation';

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

describe('useCheckInAttendeeMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks in attendee and invalidates related queries', async () => {
    mockCaller.mockResolvedValueOnce({
      success: true,
      result: {
        success: true,
        status: 'checked_in',
        official_check_in_time: '2026-07-05T02:00:00.000Z',
        attendee_kind: 'registered',
        message: 'Checked in',
      },
    });

    const { result, queryClient } = renderHookWithClient(() => useCheckInAttendeeMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const payload = {
      event_id: 'event-1',
      attendee_kind: 'registered' as const,
      registration_id: 'registration-1',
    };

    const response = await act(async () => result.current.mutateAsync(payload));

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('check-in-attendee');
    expect(mockCaller).toHaveBeenCalledWith(payload);
    expect(response).toEqual({
      success: true,
      status: 'checked_in',
      official_check_in_time: '2026-07-05T02:00:00.000Z',
      attendee_kind: 'registered',
      message: 'Checked in',
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['admin-attendance-search', 'event-1'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.adminAttendanceAnswers('event-1'),
      });
    });
  });

  it('throws edge function error message when response is unsuccessful', async () => {
    mockCaller.mockResolvedValueOnce({
      success: false,
      error: 'Unable to check in attendee',
      error_code: 'check_in_failed',
    });

    const { result } = renderHookWithClient(() => useCheckInAttendeeMutation());

    await expect(
      result.current.mutateAsync({
        event_id: 'event-2',
        attendee_kind: 'registered',
        registration_id: 'registration-2',
      }),
    ).rejects.toThrow('Unable to check in attendee');
  });

  it('throws fallback error when failed response has no error message', async () => {
    mockCaller.mockResolvedValueOnce({ success: false });

    const { result } = renderHookWithClient(() => useCheckInAttendeeMutation());

    await expect(
      result.current.mutateAsync({
        event_id: 'event-3',
        attendee_kind: 'registered',
        registration_id: 'registration-3',
      }),
    ).rejects.toThrow('Failed to check in attendee.');
  });
});
