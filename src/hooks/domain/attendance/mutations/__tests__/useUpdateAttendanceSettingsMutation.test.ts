import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { QUERY_KEYS } from '@/config/constants';
import { useUpdateAttendanceSettingsMutation } from '@/hooks/domain/attendance/mutations/useUpdateAttendanceSettingsMutation';

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

describe('useUpdateAttendanceSettingsMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates attendance settings and invalidates attendance settings query', async () => {
    mockCaller.mockResolvedValueOnce({
      success: true,
      settings: {
        event_id: 'event-1',
        attendance_enabled: true,
        timeslot_enabled: true,
        timeslots: ['2026-07-10T10:30+08:00'],
        updated_at: '2026-07-01T01:00:00.000Z',
      },
    });

    const { result, queryClient } = renderHookWithClient(() =>
      useUpdateAttendanceSettingsMutation(),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const payload = {
      event_id: 'event-1',
      attendance_enabled: true,
      timeslot_enabled: true,
      timeslots: ['2026-07-10T10:30+08:00'],
    };

    const response = await act(async () => result.current.mutateAsync(payload));

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('update-attendance-settings');
    expect(mockCaller).toHaveBeenCalledWith(payload);
    expect(response).toEqual({
      event_id: 'event-1',
      attendance_enabled: true,
      timeslot_enabled: true,
      timeslots: ['2026-07-10T10:30+08:00'],
      updated_at: '2026-07-01T01:00:00.000Z',
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.adminAttendanceSettings('event-1'),
      });
    });
  });

  it('throws edge function error when update fails', async () => {
    mockCaller.mockResolvedValueOnce({
      success: false,
      error: 'Attendance settings update failed',
      error_code: 'update_failed',
    });

    const { result } = renderHookWithClient(() => useUpdateAttendanceSettingsMutation());

    await expect(
      result.current.mutateAsync({
        event_id: 'event-2',
        attendance_enabled: true,
        timeslot_enabled: false,
        timeslots: [],
      }),
    ).rejects.toThrow('Attendance settings update failed');
  });

  it('throws fallback error message when failure response has no error field', async () => {
    mockCaller.mockResolvedValueOnce({ success: false });

    const { result } = renderHookWithClient(() => useUpdateAttendanceSettingsMutation());

    await expect(
      result.current.mutateAsync({
        event_id: 'event-3',
        attendance_enabled: false,
        timeslot_enabled: false,
        timeslots: [],
      }),
    ).rejects.toThrow('Failed to update attendance settings.');
  });
});
