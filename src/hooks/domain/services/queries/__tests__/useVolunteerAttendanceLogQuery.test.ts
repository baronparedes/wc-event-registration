import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useVolunteerAttendanceLogQuery } from '@/hooks/domain/services';

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

describe('useVolunteerAttendanceLogQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches volunteer attendance logs successfully', async () => {
    const mockData = [
      {
        id: 'log-1',
        service_date: '2026-01-04',
        time_slot: '9AM',
        is_walk_in: false,
        is_override: false,
        is_manual_entry: false,
        status: 'present',
      },
      {
        id: null,
        service_date: '2026-01-11',
        time_slot: '12NN',
        is_walk_in: false,
        is_override: false,
        is_manual_entry: false,
        status: 'absent',
      },
      {
        id: null,
        service_date: '2026-01-18',
        time_slot: '3PM',
        is_walk_in: false,
        is_override: false,
        is_manual_entry: false,
        status: 'excused',
      },
    ];

    mockRpc.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHookWithClient(() =>
      useVolunteerAttendanceLogQuery({
        user_id: 'u-1',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
        excuse_event_id: 'event-123',
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith('get_volunteer_attendance_log', {
      p_user_id: 'u-1',
      p_start_date: '2026-01-01',
      p_end_date: '2026-03-31',
      p_excuse_event_id: 'event-123',
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('throws an error when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Database error' } });

    const { result } = renderHookWithClient(() =>
      useVolunteerAttendanceLogQuery({
        user_id: 'u-1',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
      }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Failed to fetch volunteer attendance log');
  });
});
