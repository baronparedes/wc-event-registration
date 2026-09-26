import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useExportCommitmentDashboardStatsCSVMutation } from '@/hooks/domain/services';

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

describe('useExportCommitmentDashboardStatsCSVMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all pages and generates CSV text and filename', async () => {
    const mockPage1 = [
      {
        user_id: 'u-1',
        member_id: 'MEM-001',
        avatar_object_key: null,
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
        wi_5th_sunday: 0,
        attendance_score: 9.5,
        total_count: 501,
      },
    ];

    const mockPage2 = [
      {
        user_id: 'u-2',
        member_id: 'MEM-002',
        avatar_object_key: null,
        full_name: 'John Smith',
        nickname: 'Johnny',
        email: 'john@example.com',
        role: 'Greeter',
        category: 'Men',
        start_date: '2025-02-01',
        committed: 10,
        attended: 10,
        absences: 0,
        excused: 0,
        wi_9am_3pm: 0,
        wi_12nn: 0,
        wi_5th_sunday: 0,
        attendance_score: 10,
        total_count: 501,
      },
    ];

    mockRpc.mockImplementation((_fn, params) => {
      if (params.p_page === 1) {
        return Promise.resolve({ data: mockPage1, error: null });
      }
      return Promise.resolve({ data: mockPage2, error: null });
    });

    const { result } = renderHookWithClient(() => useExportCommitmentDashboardStatsCSVMutation());

    const exportPromise = result.current.mutateAsync({
      start_date: '2025-01-01',
      end_date: '2025-03-31',
      timeframe: 'Q1',
      search_query: 'Jane',
      role: 'Usher',
      category: 'Women',
    });

    await waitFor(() => expect(result.current.isIdle).toBe(false));
    const output = await exportPromise;

    expect(mockRpc).toHaveBeenCalledWith('get_commitment_dashboard_stats', {
      p_start_date: '2025-01-01',
      p_end_date: '2025-03-31',
      p_excuse_event_id: null,
      p_search_query: 'Jane',
      p_role: 'Usher',
      p_category: 'Women',
      p_page: 1,
      p_page_size: 500,
    });

    expect(mockRpc).toHaveBeenCalledWith('get_commitment_dashboard_stats', {
      p_start_date: '2025-01-01',
      p_end_date: '2025-03-31',
      p_excuse_event_id: null,
      p_search_query: 'Jane',
      p_role: 'Usher',
      p_category: 'Women',
      p_page: 2,
      p_page_size: 500,
    });

    expect(output.totalCount).toBe(2);
    expect(output.filename).toMatch(/^service-commitment-q1-\d{8}-\d{6}\.csv$/);
    expect(output.csvText).toContain('Jane Doe');
    expect(output.csvText).toContain('John Smith');
  });

  it('throws error when first page RPC fails', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to execute query' },
    });

    const { result } = renderHookWithClient(() => useExportCommitmentDashboardStatsCSVMutation());

    await expect(
      result.current.mutateAsync({
        start_date: '2025-01-01',
        end_date: '2025-03-31',
      }),
    ).rejects.toThrow(
      'Failed to fetch commitment dashboard stats for export: Failed to execute query',
    );
  });
});
