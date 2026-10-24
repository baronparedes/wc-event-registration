import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/lib/infrastructure';

import {
  cancelServiceExcuse,
  createServiceLayout,
  createServiceSeat,
  deleteServiceAttendance,
  deleteServiceSeat,
  fetchActiveServiceLayout,
  fetchAllCommitmentDashboardStatsForExport,
  fetchCommitmentDashboardStatsPage,
  fetchMemberServiceExcuses,
  fetchMissedServiceCommitments,
  fetchServiceAttendancePage,
  fetchServiceDashboardStats,
  fetchServiceExceptionDates,
  fetchServiceLayouts,
  fetchServiceSeats,
  fetchServiceUsersByNameFilter,
  fetchServiceUsersByRfids,
  fetchServiceWeeklyBriefByDate,
  fetchServiceWeeklyBriefs,
  fetchUserCommitmentHistory,
  fetchVolunteerAttendanceLog,
  recordServiceAttendance,
  submitServiceExcuse,
  triggerWeeklySundayDebrief,
  updateServiceAttendance,
  updateServiceLayout,
  updateServiceSeat,
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

  describe('service layouts', () => {
    it('fetches service layouts and handles empty list and database errors', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [{ id: 'layout-1' }], error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      const result = await fetchServiceLayouts();
      expect(result).toEqual([{ id: 'layout-1' }]);

      query.order.mockResolvedValueOnce({ data: null, error: null });
      expect(await fetchServiceLayouts()).toEqual([]);

      query.order.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });
      await expect(fetchServiceLayouts()).rejects.toThrow(
        'Failed to fetch service layouts: db error',
      );
    });

    it('fetches active service layout or returns null, and throws on error', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'active-layout' }, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      expect(await fetchActiveServiceLayout()).toEqual({ id: 'active-layout' });

      query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      expect(await fetchActiveServiceLayout()).toBeNull();

      query.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'layout query failed' },
      });
      await expect(fetchActiveServiceLayout()).rejects.toThrow(
        'Failed to fetch active service layout: layout query failed',
      );
    });

    it('creates service layout with default values and throws on error', async () => {
      const query = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'new-layout' }, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      const result = await createServiceLayout({ description: 'Main Hall' });
      expect(result).toEqual({ id: 'new-layout' });
      expect(query.insert).toHaveBeenCalledWith({
        description: 'Main Hall',
        is_active: true,
        metadata: {},
      });

      query.single.mockResolvedValueOnce({ data: null, error: { message: 'insert error' } });
      await expect(createServiceLayout({ description: 'Main Hall' })).rejects.toThrow(
        'Failed to create service layout: insert error',
      );
    });

    it('updates service layout and throws on error', async () => {
      const query = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: { id: 'layout-1', is_active: false }, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      const result = await updateServiceLayout('layout-1', { is_active: false });
      expect(result).toEqual({ id: 'layout-1', is_active: false });

      query.single.mockResolvedValueOnce({ data: null, error: { message: 'update error' } });
      await expect(updateServiceLayout('layout-1', { is_active: false })).rejects.toThrow(
        'Failed to update service layout: update error',
      );
    });
  });

  describe('service seats', () => {
    it('fetches service seats for layout and handles empty and error cases', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [{ id: 'seat-1' }], error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      expect(await fetchServiceSeats('layout-1')).toEqual([{ id: 'seat-1' }]);

      query.order.mockResolvedValueOnce({ data: null, error: null });
      expect(await fetchServiceSeats('layout-1')).toEqual([]);

      query.order.mockResolvedValueOnce({ data: null, error: { message: 'seats error' } });
      await expect(fetchServiceSeats('layout-1')).rejects.toThrow(
        'Failed to fetch service seats: seats error',
      );
    });

    it('creates service seat with default values and throws on error', async () => {
      const query = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'seat-1' }, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      const result = await createServiceSeat({ layout_id: 'layout-1', table_number: 'Table 1' });
      expect(result).toEqual({ id: 'seat-1' });
      expect(query.insert).toHaveBeenCalledWith({
        layout_id: 'layout-1',
        table_number: 'Table 1',
        area: null,
        seat_number: null,
        metadata: {},
      });

      query.single.mockResolvedValueOnce({ data: null, error: { message: 'seat error' } });
      await expect(
        createServiceSeat({ layout_id: 'layout-1', table_number: 'Table 1' }),
      ).rejects.toThrow('Failed to create service seat: seat error');
    });

    it('updates service seat and throws on error', async () => {
      const query = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'seat-1' }, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      expect(await updateServiceSeat('seat-1', { table_number: 'Table 2' })).toEqual({
        id: 'seat-1',
      });

      query.single.mockResolvedValueOnce({ data: null, error: { message: 'update failed' } });
      await expect(updateServiceSeat('seat-1', { table_number: 'Table 2' })).rejects.toThrow(
        'Failed to update service seat: update failed',
      );
    });

    it('deletes service seat and throws on error', async () => {
      const query = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      await expect(deleteServiceSeat('seat-1')).resolves.toBeUndefined();

      query.eq.mockResolvedValueOnce({ error: { message: 'delete failed' } });
      await expect(deleteServiceSeat('seat-1')).rejects.toThrow(
        'Failed to delete service seat: delete failed',
      );
    });
  });

  describe('service attendance records', () => {
    it('records service attendance with defaults and throws on error', async () => {
      const query = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'att-1' }, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      const result = await recordServiceAttendance({
        user_id: 'user-1',
        service_date: '2026-10-18',
        time_slot: '9AM',
      });
      expect(result).toEqual({ id: 'att-1' });
      expect(query.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          rfid: null,
          service_date: '2026-10-18',
          time_slot: '9AM',
          is_walk_in: false,
          is_override: false,
          is_manual_entry: false,
          service_seat_id: null,
          metadata: {},
        }),
      );

      query.single.mockResolvedValueOnce({ data: null, error: { message: 'record failed' } });
      await expect(
        recordServiceAttendance({ user_id: 'u', service_date: '2026-10-18', time_slot: '9AM' }),
      ).rejects.toThrow('Failed to record service attendance: record failed');
    });

    it('updates service attendance and throws on error', async () => {
      const query = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'att-1' }, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      expect(await updateServiceAttendance('att-1', { is_override: true })).toEqual({
        id: 'att-1',
      });

      query.single.mockResolvedValueOnce({ data: null, error: { message: 'update failed' } });
      await expect(updateServiceAttendance('att-1', { is_override: true })).rejects.toThrow(
        'Failed to update service attendance: update failed',
      );
    });

    it('deletes service attendance and throws on error', async () => {
      const query = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      await expect(deleteServiceAttendance('att-1')).resolves.toBeUndefined();

      query.eq.mockResolvedValueOnce({ error: { message: 'delete failed' } });
      await expect(deleteServiceAttendance('att-1')).rejects.toThrow(
        'Failed to delete service attendance record: delete failed',
      );
    });
  });

  describe('service users lookups & commitment history', () => {
    it('fetches service users by RFIDs and throws on error', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ id: 'u-1', member_id: 'RFID-1', full_name: 'Test Member' }],
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      expect(await fetchServiceUsersByRfids(['RFID-1'])).toEqual([
        { id: 'u-1', member_id: 'RFID-1', full_name: 'Test Member' },
      ]);

      query.in.mockResolvedValueOnce({ data: null, error: null });
      expect(await fetchServiceUsersByRfids(['RFID-1'])).toEqual([]);

      query.in.mockResolvedValueOnce({ data: null, error: new Error('rfid query error') });
      await expect(fetchServiceUsersByRfids(['RFID-1'])).rejects.toThrow('rfid query error');
    });

    it('fetches service users by name filter and throws on error', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [{ id: 'u-1' }], error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      expect(await fetchServiceUsersByNameFilter('full_name.ilike.%Test%')).toEqual([
        { id: 'u-1' },
      ]);

      query.or.mockResolvedValueOnce({ data: null, error: null });
      expect(await fetchServiceUsersByNameFilter('full_name.ilike.%Test%')).toEqual([]);

      query.or.mockResolvedValueOnce({ data: null, error: new Error('name query error') });
      await expect(fetchServiceUsersByNameFilter('full_name.ilike.%Test%')).rejects.toThrow(
        'name query error',
      );
    });

    it('fetches user commitment history and throws on error', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => void) => resolve({ data: [{ id: 'c-1' }], error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      expect(await fetchUserCommitmentHistory('user-1')).toEqual([{ id: 'c-1' }]);

      const errQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: null, error: new Error('history failed') }),
      };
      vi.mocked(supabase.from).mockReturnValue(errQuery as never);
      await expect(fetchUserCommitmentHistory('user-1')).rejects.toThrow('history failed');
    });

    it('fetches service exception dates and throws on error', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [{ exception_date: '2026-12-25' }], error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      expect(await fetchServiceExceptionDates()).toEqual([{ exception_date: '2026-12-25' }]);

      query.order.mockResolvedValueOnce({ data: null, error: null });
      expect(await fetchServiceExceptionDates()).toEqual([]);

      query.order.mockResolvedValueOnce({ data: null, error: new Error('exception dates failed') });
      await expect(fetchServiceExceptionDates()).rejects.toThrow('exception dates failed');
    });
  });

  describe('dashboard stats & RPCs', () => {
    it('fetches service dashboard stats and throws on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { total: 100 }, error: null } as never);
      expect(await fetchServiceDashboardStats({ p_year: 2026 })).toEqual({ total: 100 });

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'stats failed' },
      } as never);
      await expect(fetchServiceDashboardStats({ p_year: 2026 })).rejects.toThrow(
        'Failed to fetch service dashboard stats: stats failed',
      );
    });

    it('fetches missed service commitments and throws on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [{ user_id: 'u-1' }],
        error: null,
      } as never);
      expect(await fetchMissedServiceCommitments({ p_year: 2026 })).toEqual([{ user_id: 'u-1' }]);

      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as never);
      expect(await fetchMissedServiceCommitments({ p_year: 2026 })).toEqual([]);

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'missed failed' },
      } as never);
      await expect(fetchMissedServiceCommitments({ p_year: 2026 })).rejects.toThrow(
        'Failed to fetch missed service commitments: missed failed',
      );
    });

    it('fetches commitment dashboard stats page with filters and throws on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [{ id: 'stat-1' }],
        error: null,
      } as never);
      const res = await fetchCommitmentDashboardStatsPage(
        {
          start_date: '2026-03-01',
          end_date: '2026-03-31',
          search_query: 'Test User',
          role: 'Usher',
          category: 'Member',
        },
        1,
        10,
      );
      expect(res).toEqual([{ id: 'stat-1' }]);

      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as never);
      expect(
        await fetchCommitmentDashboardStatsPage(
          { start_date: '2026-03-01', end_date: '2026-03-31' },
          1,
          10,
        ),
      ).toEqual([]);

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'page failed' },
      } as never);
      await expect(
        fetchCommitmentDashboardStatsPage(
          { start_date: '2026-03-01', end_date: '2026-03-31' },
          1,
          10,
        ),
      ).rejects.toThrow('Failed to fetch commitment dashboard stats: page failed');
    });

    it('handles empty first page in fetchAllCommitmentDashboardStatsForExport', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [], error: null } as never);
      expect(
        await fetchAllCommitmentDashboardStatsForExport(
          { start_date: '2026-03-01', end_date: '2026-03-31' },
          10,
        ),
      ).toEqual([]);
    });

    it('fetches volunteer attendance log and throws on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [{ log: 1 }], error: null } as never);
      expect(
        await fetchVolunteerAttendanceLog({
          user_id: 'u-1',
          start_date: '2026-01-01',
          end_date: '2026-01-31',
        }),
      ).toEqual([{ log: 1 }]);

      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as never);
      expect(
        await fetchVolunteerAttendanceLog({
          user_id: 'u-1',
          start_date: '2026-01-01',
          end_date: '2026-01-31',
        }),
      ).toEqual([]);

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'log failed' },
      } as never);
      await expect(
        fetchVolunteerAttendanceLog({
          user_id: 'u-1',
          start_date: '2026-01-01',
          end_date: '2026-01-31',
        }),
      ).rejects.toThrow('Failed to fetch volunteer attendance log: log failed');
    });
  });

  describe('weekly brief & debrief', () => {
    it('triggers weekly sunday debrief with default and custom params', async () => {
      mockCaller.mockResolvedValueOnce({ success: true, count: 5 });
      expect(await triggerWeeklySundayDebrief()).toEqual({ success: true, count: 5 });
      expect(mockCaller).toHaveBeenCalledWith({});

      mockCaller.mockResolvedValueOnce({ success: true, count: 2 });
      expect(await triggerWeeklySundayDebrief({ sunday_date: '2026-10-18' })).toEqual({
        success: true,
        count: 2,
      });
      expect(mockCaller).toHaveBeenCalledWith({ sunday_date: '2026-10-18' });
    });

    it('fetches service weekly briefs and throws on error', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{ sunday_date: '2026-10-18' }], error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      expect(await fetchServiceWeeklyBriefs()).toEqual([{ sunday_date: '2026-10-18' }]);
      expect(query.limit).toHaveBeenCalledWith(20);

      query.limit.mockResolvedValueOnce({ data: null, error: null });
      expect(await fetchServiceWeeklyBriefs(5)).toEqual([]);
      expect(query.limit).toHaveBeenCalledWith(5);

      query.limit.mockResolvedValueOnce({ data: null, error: { message: 'briefs failed' } });
      await expect(fetchServiceWeeklyBriefs()).rejects.toThrow(
        'Failed to fetch weekly briefs: briefs failed',
      );
    });

    it('fetches service weekly brief by date or returns null, and throws on error', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: { sunday_date: '2026-10-18' }, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);

      expect(await fetchServiceWeeklyBriefByDate('2026-10-18')).toEqual({
        sunday_date: '2026-10-18',
      });

      query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      expect(await fetchServiceWeeklyBriefByDate('2026-10-18')).toBeNull();

      query.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'single failed' } });
      await expect(fetchServiceWeeklyBriefByDate('2026-10-18')).rejects.toThrow(
        'Failed to fetch weekly brief for 2026-10-18: single failed',
      );
    });
  });
});
