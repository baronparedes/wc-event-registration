import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/lib/infrastructure';

import {
  cancelServiceExcuse,
  fetchAllCommitmentDashboardStatsForExport,
  fetchMemberServiceExcuses,
  fetchServiceAttendancePage,
  submitServiceExcuse,
} from '../api';

const { mockCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const caller = vi.fn();
  return {
    mockCaller: caller,
    mockCreateEdgeFunctionCaller: vi.fn(() => caller),
  };
});

vi.mock('@/lib/infrastructure', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
  createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
}));

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
    it('submits a new excuse request successfully via edge function', async () => {
      const mockResult = {
        id: 'excuse-1',
        user_id: 'user-1',
        member_id: 'MEM-001',
        request_date: '2026-10-18',
        services: ['9AM'],
        reason: 'Out of town',
        status: 'approved',
        created_at: '2026-10-17T00:00:00Z',
        updated_at: '2026-10-17T00:00:00Z',
      };
      mockCaller.mockResolvedValueOnce({ success: true, excuse: mockResult });

      const result = await submitServiceExcuse({
        user_id: 'c81373ea-9878-43d9-95cb-64a0e98032f2',
        member_id: 'MEM-001',
        request_date: '2026-10-18',
        services: ['9AM'],
        reason: 'Out of town',
      });

      expect(mockCaller).toHaveBeenCalledWith({
        user_id: 'c81373ea-9878-43d9-95cb-64a0e98032f2',
        member_id: 'MEM-001',
        request_date: '2026-10-18',
        services: ['9AM'],
        reason: 'Out of town',
      });
      expect(result).toEqual(mockResult);
    });

    it('submits an excuse request with member_token for unauthenticated flow', async () => {
      const mockResult = {
        id: 'excuse-2',
        user_id: 'user-2',
        member_id: 'MEM-002',
        request_date: '2026-10-18',
        services: ['All Services'],
        reason: null,
        status: 'approved',
        created_at: '2026-10-17T00:00:00Z',
        updated_at: '2026-10-17T00:00:00Z',
      };
      mockCaller.mockResolvedValueOnce({ success: true, excuse: mockResult });

      const result = await submitServiceExcuse({
        member_token: 'mlt2.mock.token',
        request_date: '2026-10-18',
        services: ['All Services'],
      });

      expect(mockCaller).toHaveBeenCalledWith({
        member_token: 'mlt2.mock.token',
        request_date: '2026-10-18',
        services: ['All Services'],
      });
      expect(result).toEqual(mockResult);
    });

    it('throws error when edge function call fails', async () => {
      mockCaller.mockRejectedValueOnce(new Error('Edge function network failure'));

      await expect(
        submitServiceExcuse({
          member_id: 'MEM-001',
          request_date: '2026-10-18',
          services: ['All Services'],
          reason: '',
        }),
      ).rejects.toThrow('Edge function network failure');
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
        or: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown) => void) => resolve({ data: mockList, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      const result = await fetchMemberServiceExcuses('user-1', '2026-10-01', '2026-10-31');
      expect(supabase.from).toHaveBeenCalledWith('service_excuse_requests');
      expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(query.or).toHaveBeenCalledWith('request_date.gte.2026-10-01,end_date.gte.2026-10-01');
      expect(query.or).toHaveBeenCalledWith(
        'request_date.lte.2026-10-31,start_date.lte.2026-10-31',
      );
      expect(result).toEqual(mockList);
    });
  });
});
