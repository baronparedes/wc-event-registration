import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useCommitmentDashboardStatsQuery } from '@/hooks/domain/services';

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

describe('useCommitmentDashboardStatsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and correctly maps commitment dashboard stats', async () => {
    const mockData = [
      {
        user_id: 'u-1',
        member_id: 'MEM-001',
        full_name: 'Jane Doe',
        nickname: 'JD',
        email: 'jane@example.com',
        role: 'Usher',
        category: 'Women',
        start_date: '2025-01-01',
        committed: 12,
        attended: 10,
        absences: 2,
        excused: 1,
        wi_9am_3pm: 2,
        wi_12nn: 1,
        attendance_score: 9.5,
        total_count: 1,
      },
    ];

    mockRpc.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHookWithClient(() =>
      useCommitmentDashboardStatsQuery({
        start_date: '2025-01-01',
        end_date: '2025-03-31',
        excuse_event_id: 'event-123',
        search_query: 'Jane',
        role: 'Usher',
        category: 'Women',
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith('get_commitment_dashboard_stats', {
      p_start_date: '2025-01-01',
      p_end_date: '2025-03-31',
      p_excuse_event_id: 'event-123',
      p_search_query: 'Jane',
      p_role: 'Usher',
      p_category: 'Women',
      p_page: 1,
      p_page_size: 500,
    });

    const page = result.current.data?.pages[0];
    expect(page?.totalCount).toBe(1);
    expect(page?.hasMore).toBe(false);
    expect(page?.nextCursor).toBeNull();
    expect(page?.items).toEqual([
      {
        user_id: 'u-1',
        member_id: 'MEM-001',
        full_name: 'Jane Doe',
        nickname: 'JD',
        email: 'jane@example.com',
        role: 'Usher',
        category: 'Women',
        start_date: '2025-01-01',
        committed: 12,
        attended: 10,
        absences: 2,
        excused: 1,
        wi_9am_3pm: 2,
        wi_12nn: 1,
        attendance_score: 9.5,
      },
    ]);
  });

  it('handles empty data returned from RPC', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHookWithClient(() =>
      useCommitmentDashboardStatsQuery({
        start_date: '2025-01-01',
        end_date: '2025-03-31',
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const page = result.current.data?.pages[0];
    expect(page?.totalCount).toBe(0);
    expect(page?.items).toEqual([]);
    expect(page?.hasMore).toBe(false);
    expect(page?.nextCursor).toBeNull();
  });

  it('handles pagination next cursor when totalCount exceeds pageSize', async () => {
    const mockData = [
      {
        user_id: 'u-1',
        member_id: 'MEM-001',
        full_name: 'Jane Doe',
        nickname: 'JD',
        email: 'jane@example.com',
        role: 'Usher',
        category: 'Women',
        start_date: '2025-01-01',
        committed: 12,
        attended: 10,
        absences: 2,
        excused: 1,
        wi_9am_3pm: 2,
        wi_12nn: 1,
        attendance_score: 9.5,
        total_count: 5,
      },
    ];

    mockRpc.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHookWithClient(() =>
      useCommitmentDashboardStatsQuery(
        {
          start_date: '2025-01-01',
          end_date: '2025-03-31',
        },
        1, // pageSize = 1, totalCount = 5 -> hasMore = true
      ),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const page = result.current.data?.pages[0];
    expect(page?.hasMore).toBe(true);
    expect(page?.nextCursor).toBe('1');
  });

  it('throws an error when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Database query timeout' } });

    const { result } = renderHookWithClient(() =>
      useCommitmentDashboardStatsQuery({
        start_date: '2025-01-01',
        end_date: '2025-03-31',
      }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Database query timeout');
  });
});
