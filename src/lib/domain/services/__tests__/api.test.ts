import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/lib/infrastructure';

import {
  cancelServiceExcuse,
  fetchAllCommitmentDashboardStatsForExport,
  fetchMemberServiceExcuses,
  fetchServiceAttendancePage,
  submitServiceExcuse,
} from '../api';

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

  describe('service excuse requests', () => {
    it('submits a new excuse request successfully', async () => {
      const mockResult = {
        id: 'excuse-1',
        user_id: 'user-1',
        member_id: 'MEM-001',
        request_date: '2026-10-18',
        services: ['9AM'],
        reason: 'Out of town',
        status: 'approved',
      };
      const query = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockResult, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      const result = await submitServiceExcuse({
        user_id: 'user-1',
        member_id: 'MEM-001',
        request_date: '2026-10-18',
        services: ['9AM'],
        reason: 'Out of town',
      });

      expect(supabase.from).toHaveBeenCalledWith('service_excuse_requests');
      expect(query.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          member_id: 'MEM-001',
          request_date: '2026-10-18',
          services: ['9AM'],
          reason: 'Out of town',
          status: 'approved',
        }),
      );
      expect(result).toEqual(mockResult);
    });

    it('throws error when submitting excuse request fails', async () => {
      const query = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB constraint' } }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      await expect(
        submitServiceExcuse({
          user_id: 'user-1',
          member_id: 'MEM-001',
          request_date: '2026-10-18',
          services: ['All Services'],
          reason: '',
        }),
      ).rejects.toThrow('Failed to submit excuse request: DB constraint');
    });

    it('cancels an excuse request', async () => {
      const query = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      await cancelServiceExcuse('excuse-1');
      expect(supabase.from).toHaveBeenCalledWith('service_excuse_requests');
      expect(query.update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(query.eq).toHaveBeenCalledWith('id', 'excuse-1');
    });

    it('fetches member service excuses with optional date filters', async () => {
      const mockList = [{ id: 'excuse-1', user_id: 'user-1' }];
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown) => void) => resolve({ data: mockList, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      const result = await fetchMemberServiceExcuses('user-1', '2026-10-01', '2026-10-31');
      expect(supabase.from).toHaveBeenCalledWith('service_excuse_requests');
      expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(query.gte).toHaveBeenCalledWith('request_date', '2026-10-01');
      expect(query.lte).toHaveBeenCalledWith('request_date', '2026-10-31');
      expect(result).toEqual(mockList);
    });
  });
});
