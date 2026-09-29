import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/lib/infrastructure';

import { fetchAllCommitmentDashboardStatsForExport, fetchServiceAttendancePage } from '../api';

vi.mock('@/lib/infrastructure', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

describe('service API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('applies date and attendance filters before returning a page', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => void) =>
        resolve({ data: [{ id: 'record-1' }], count: 1, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const result = await fetchServiceAttendancePage({
      offset: 20,
      pageSize: 10,
      filters: {
        end_date: '2026-03-15',
        time_slot: '9AM',
        is_walk_in: false,
        is_override: true,
        user_id: 'user-1',
        rfid: 'RFID-001',
      },
    });

    expect(result).toEqual({ rows: [{ id: 'record-1' }], count: 1 });
    expect(query.range).toHaveBeenCalledWith(20, 29);
    expect(query.gte).toHaveBeenCalledWith('service_date', '2026-03-15');
    expect(query.lte).toHaveBeenCalledWith('service_date', '2026-03-15');
    expect(query.eq.mock.calls).toEqual([
      ['time_slot', '9AM'],
      ['is_walk_in', false],
      ['is_override', true],
      ['user_id', 'user-1'],
      ['rfid', 'RFID-001'],
    ]);
  });

  it('returns empty attendance rows and reports database errors', async () => {
    const result = { data: null, count: 0, error: null as { message: string } | null };
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => void) => resolve(result),
    };
    vi.mocked(supabase.from).mockReturnValue(query as never);

    expect(await fetchServiceAttendancePage({ offset: 0, pageSize: 10, filters: {} })).toEqual({
      rows: [],
      count: 0,
    });

    result.error = { message: 'connection lost' };
    await expect(
      fetchServiceAttendancePage({ offset: 0, pageSize: 10, filters: {} }),
    ).rejects.toThrow('Failed to fetch service attendance: connection lost');
  });

  it('gathers every commitment export page and propagates later page failures', async () => {
    const filters = { start_date: '2026-03-01', end_date: '2026-03-31' };
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: [{ id: 'one', total_count: 3 }], error: null } as never)
      .mockResolvedValueOnce({ data: [{ id: 'two' }], error: null } as never)
      .mockResolvedValueOnce({ data: [{ id: 'three' }], error: null } as never);

    expect(await fetchAllCommitmentDashboardStatsForExport(filters, 1)).toEqual([
      { id: 'one', total_count: 3 },
      { id: 'two' },
      { id: 'three' },
    ]);
    expect(vi.mocked(supabase.rpc).mock.calls.map(([, args]) => args?.p_page)).toEqual([1, 2, 3]);

    vi.mocked(supabase.rpc).mockReset();
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: [{ total_count: 2 }], error: null } as never)
      .mockResolvedValueOnce({ data: null, error: { message: 'page unavailable' } } as never);
    await expect(fetchAllCommitmentDashboardStatsForExport(filters, 1)).rejects.toThrow(
      'Failed to fetch commitment dashboard stats page for export: page unavailable',
    );
  });

  it('rejects an export when its first page fails', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: 'not authorized' },
    } as never);

    await expect(
      fetchAllCommitmentDashboardStatsForExport(
        { start_date: '2026-03-01', end_date: '2026-03-31' },
        25,
      ),
    ).rejects.toThrow('Failed to fetch commitment dashboard stats for export: not authorized');
    expect(supabase.rpc).toHaveBeenCalledOnce();
  });
});
