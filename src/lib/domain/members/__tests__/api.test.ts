import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchMembersAttendanceScores } from '@/lib/domain/members/api';
import { supabase } from '@/lib/infrastructure';

vi.mock('@/lib/infrastructure', () => {
  const rpcMock = vi.fn();

  return {
    supabase: {
      rpc: rpcMock,
      _mocks: {
        rpcMock,
      },
    },
  };
});

describe('fetchMembersAttendanceScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates attendance scores by user_id from get_commitment_dashboard_stats', async () => {
    const mockMocks = (
      supabase as unknown as {
        _mocks: {
          rpcMock: ReturnType<typeof vi.fn>;
        };
      }
    )._mocks;

    mockMocks.rpcMock.mockResolvedValueOnce({
      data: [
        { user_id: 'user-1', attendance_score: 8.5, total_count: 2 },
        { user_id: 'user-2', attendance_score: -1.0, total_count: 2 },
      ],
      error: null,
    });

    const result = await fetchMembersAttendanceScores(12, 'excuse-event-1');

    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_commitment_dashboard_stats',
      expect.objectContaining({
        p_excuse_event_id: 'excuse-event-1',
        p_page: 1,
        p_page_size: 500,
      }),
    );

    expect(result.get('user-1')?.attendanceScore).toBe(8.5);
    expect(result.get('user-2')?.attendanceScore).toBe(-1.0);
    expect(result.has('user-3')).toBe(false);
  });

  it('calculates turnupRate by deducting excused dates from committed denominator', async () => {
    const mockMocks = (
      supabase as unknown as {
        _mocks: {
          rpcMock: ReturnType<typeof vi.fn>;
        };
      }
    )._mocks;

    mockMocks.rpcMock.mockResolvedValueOnce({
      data: [
        {
          user_id: 'user-excused',
          attendance_score: 4.5,
          committed: 12,
          attended: 8,
          excused: 1,
          total_count: 1,
        },
      ],
      error: null,
    });

    const result = await fetchMembersAttendanceScores(12);
    const stats = result.get('user-excused');
    expect(stats).toBeDefined();
    // 8 attended / (12 committed - 1 excused = 11 effective) = 8 / 11 ~= 0.72727
    expect(stats?.turnupRate).toBeCloseTo(8 / 11, 4);
    expect(stats?.committed).toBe(12);
    expect(stats?.attended).toBe(8);
  });

  it('handles multi-page results properly', async () => {
    const mockMocks = (
      supabase as unknown as {
        _mocks: {
          rpcMock: ReturnType<typeof vi.fn>;
        };
      }
    )._mocks;

    mockMocks.rpcMock
      .mockResolvedValueOnce({
        data: [{ user_id: 'user-1', attendance_score: 5, total_count: 501 }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ user_id: 'user-2', attendance_score: 10, total_count: 501 }],
        error: null,
      });

    const result = await fetchMembersAttendanceScores(12);

    expect(mockMocks.rpcMock).toHaveBeenCalledTimes(2);
    expect(result.get('user-1')?.attendanceScore).toBe(5);
    expect(result.get('user-2')?.attendanceScore).toBe(10);
  });

  it('throws error when rpc fails', async () => {
    const mockMocks = (
      supabase as unknown as {
        _mocks: {
          rpcMock: ReturnType<typeof vi.fn>;
        };
      }
    )._mocks;

    mockMocks.rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failed' },
    });

    await expect(fetchMembersAttendanceScores(12)).rejects.toThrow(
      'Failed to fetch attendance scores: Database connection failed',
    );
  });
});
