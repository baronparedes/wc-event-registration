import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type MemberUpdatePayload,
  addMemberNote,
  deleteMemberNote,
  fetchMemberEventHistory,
  fetchMemberMetadata,
  fetchMembersAttendanceScores,
  fetchMembersImportSnapshot,
  setMemberActiveStatus,
  updateMember,
} from '@/lib/domain/members/api';

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/lib/infrastructure', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

describe('Members Domain API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchMembersImportSnapshot', () => {
    it('returns array of member snapshot rows on success', async () => {
      const mockOrder = vi.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'u-1',
            member_id: 'RFID-001',
            first_name: 'Test John',
            last_name: 'Test Doe',
            nickname: 'Test JD',
            is_active: true,
            email: 'john@example.com',
            phone: '0911',
            date_of_birth: '1990-01-01',
            role: 'Member',
            category: 'Adults',
            metadata: {},
          },
        ],
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await fetchMembersImportSnapshot();

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith(
        'id, member_id, first_name, last_name, nickname, is_active, email, phone, date_of_birth, role, category, metadata',
      );
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(result).toHaveLength(1);
      expect(result[0].member_id).toBe('RFID-001');
    });

    it('returns empty array if data is null', async () => {
      const mockOrder = vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({ order: mockOrder }),
      });

      const result = await fetchMembersImportSnapshot();
      expect(result).toEqual([]);
    });

    it('throws error when supabase query fails', async () => {
      const mockOrder = vi.fn().mockResolvedValueOnce({
        data: null,
        error: new Error('Permission denied'),
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({ order: mockOrder }),
      });

      await expect(fetchMembersImportSnapshot()).rejects.toThrow('Permission denied');
    });
  });

  describe('fetchMemberEventHistory', () => {
    it('calls get_member_event_history rpc and returns data', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ event_id: 'e-1', event_name: 'Sunday Service' }],
        error: null,
      });

      const result = await fetchMemberEventHistory('u-123');
      expect(mockRpc).toHaveBeenCalledWith('get_member_event_history', {
        p_user_id: 'u-123',
      });
      expect(result).toEqual([{ event_id: 'e-1', event_name: 'Sunday Service' }]);
    });

    it('throws error when rpc fails', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: new Error('RPC error'),
      });

      await expect(fetchMemberEventHistory('u-123')).rejects.toThrow('RPC error');
    });
  });

  describe('fetchMemberMetadata', () => {
    it('returns metadata object when member exists', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValueOnce({
        data: { metadata: { notes: 'Sample note' } },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await fetchMemberMetadata('u-123');
      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith('metadata');
      expect(mockEq).toHaveBeenCalledWith('id', 'u-123');
      expect(result).toEqual({ metadata: { notes: 'Sample note' } });
    });

    it('returns null when user has no metadata / not found', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
        }),
      });

      const result = await fetchMemberMetadata('u-none');
      expect(result).toBeNull();
    });

    it('throws error when query fails', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
        }),
      });

      await expect(fetchMemberMetadata('u-err')).rejects.toThrow('Database error');
    });
  });

  describe('updateMember', () => {
    const samplePayload: MemberUpdatePayload = {
      full_name: 'Test John Doe',
      first_name: 'Test John',
      last_name: 'Test Doe',
      nickname: 'Test JD',
      email: 'john@example.com',
      phone: '0911',
      date_of_birth: '1990-01-01',
      role: 'Member',
      category: 'Adults',
      metadata: {},
    };

    it('updates member record successfully', async () => {
      const mockEq = vi.fn().mockResolvedValueOnce({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      await updateMember('u-123', samplePayload);
      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockUpdate).toHaveBeenCalledWith(samplePayload);
      expect(mockEq).toHaveBeenCalledWith('id', 'u-123');
    });

    it('throws error if update fails', async () => {
      const mockEq = vi.fn().mockResolvedValueOnce({ error: new Error('Update failed') });
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: mockEq }),
      });

      await expect(updateMember('u-123', samplePayload)).rejects.toThrow('Update failed');
    });
  });

  describe('setMemberActiveStatus', () => {
    it('updates active status and returns user id', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValueOnce({
        data: { id: 'u-123' },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqActive = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqActive });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const result = await setMemberActiveStatus('u-123', true);
      expect(result).toEqual({ id: 'u-123' });
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: true });
      expect(mockEqId).toHaveBeenCalledWith('id', 'u-123');
      expect(mockEqActive).toHaveBeenCalledWith('is_active', false);
    });

    it('returns null if record was not changed / not found', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
            }),
          }),
        }),
      });

      const result = await setMemberActiveStatus('u-123', false);
      expect(result).toBeNull();
    });

    it('throws error when status update fails', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: new Error('Update failed'),
      });
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
            }),
          }),
        }),
      });

      await expect(setMemberActiveStatus('u-123', true)).rejects.toThrow('Update failed');
    });
  });

  describe('addMemberNote & deleteMemberNote', () => {
    it('calls add_member_note rpc', async () => {
      mockRpc.mockResolvedValueOnce({ error: null });

      await addMemberNote('u-1', 'Test Note text', 'auth-1', 'Test Author');
      expect(mockRpc).toHaveBeenCalledWith('add_member_note', {
        p_user_id: 'u-1',
        p_text: 'Test Note text',
        p_author_id: 'auth-1',
        p_author_name: 'Test Author',
      });
    });

    it('throws error when add_member_note fails', async () => {
      mockRpc.mockResolvedValueOnce({ error: new Error('Note creation failed') });

      await expect(addMemberNote('u-1', 'Text', 'auth-1', 'Test Author')).rejects.toThrow(
        'Note creation failed',
      );
    });

    it('calls delete_member_note rpc', async () => {
      mockRpc.mockResolvedValueOnce({ error: null });

      await deleteMemberNote('u-1', 'note-123');
      expect(mockRpc).toHaveBeenCalledWith('delete_member_note', {
        p_user_id: 'u-1',
        p_note_id: 'note-123',
      });
    });

    it('throws error when delete_member_note fails', async () => {
      mockRpc.mockResolvedValueOnce({ error: new Error('Note deletion failed') });

      await expect(deleteMemberNote('u-1', 'note-123')).rejects.toThrow('Note deletion failed');
    });
  });

  describe('fetchMembersAttendanceScores', () => {
    it('aggregates attendance scores by user_id from get_commitment_dashboard_stats', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { user_id: 'user-1', attendance_score: 8.5, total_count: 2 },
          { user_id: 'user-2', attendance_score: -1.0, total_count: 2 },
        ],
        error: null,
      });

      const result = await fetchMembersAttendanceScores(12);

      expect(mockRpc).toHaveBeenCalledWith(
        'get_commitment_dashboard_stats',
        expect.objectContaining({
          p_page: 1,
          p_page_size: 500,
        }),
      );

      expect(result.get('user-1')?.attendanceScore).toBe(8.5);
      expect(result.get('user-2')?.attendanceScore).toBe(-1.0);
      expect(result.has('user-3')).toBe(false);
    });

    it('calculates turnupRate by deducting excused dates from committed denominator', async () => {
      mockRpc.mockResolvedValueOnce({
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
      expect(stats?.turnupRate).toBeCloseTo(8 / 11, 4);
      expect(stats?.committed).toBe(12);
      expect(stats?.attended).toBe(8);
    });

    it('handles turnupRate when effectiveCommitted is 0 but attended > 0 and attended === 0', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          {
            user_id: 'user-zero-com-attended',
            attendance_score: 0,
            committed: 0,
            attended: 2,
            excused: 0,
            total_count: 2,
          },
          {
            user_id: 'user-zero-com-unattended',
            attendance_score: 0,
            committed: 0,
            attended: 0,
            excused: 0,
            total_count: 2,
          },
          {
            user_id: '', // Empty user_id branch
            attendance_score: 0,
            total_count: 2,
          },
        ],
        error: null,
      });

      const result = await fetchMembersAttendanceScores({ weeks: 8 });
      expect(result.get('user-zero-com-attended')?.turnupRate).toBe(1);
      expect(result.get('user-zero-com-unattended')?.turnupRate).toBe(0.8);
      expect(result.has('')).toBe(false);
    });

    it('defaults to 12 weeks when options object has no weeks property', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await fetchMembersAttendanceScores({});
      expect(result.size).toBe(0);
      expect(mockRpc).toHaveBeenCalledWith(
        'get_commitment_dashboard_stats',
        expect.objectContaining({ p_page: 1 }),
      );
    });

    it('handles multi-page results properly', async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: [{ user_id: 'user-1', attendance_score: 5, total_count: 501 }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ user_id: 'user-2', attendance_score: 10, total_count: 501 }],
          error: null,
        });

      const result = await fetchMembersAttendanceScores(12);

      expect(mockRpc).toHaveBeenCalledTimes(2);
      expect(result.get('user-1')?.attendanceScore).toBe(5);
      expect(result.get('user-2')?.attendanceScore).toBe(10);
    });

    it('throws error when remaining page fails in multi-page fetch', async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: [{ user_id: 'user-1', attendance_score: 5, total_count: 501 }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Network timeout on page 2' },
        });

      await expect(fetchMembersAttendanceScores(12)).rejects.toThrow(
        'Failed to fetch attendance scores page: Network timeout on page 2',
      );
    });

    it('throws error when initial rpc fails', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(fetchMembersAttendanceScores(12)).rejects.toThrow(
        'Failed to fetch attendance scores: Database connection failed',
      );
    });

    it('uses custom dateRange when provided in options', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ user_id: 'user-1', attendance_score: 9.0, total_count: 1 }],
        error: null,
      });

      await fetchMembersAttendanceScores({
        dateRange: { startDate: '2026-07-01', endDate: '2026-09-30' },
      });

      expect(mockRpc).toHaveBeenCalledWith(
        'get_commitment_dashboard_stats',
        expect.objectContaining({
          p_start_date: '2026-07-01',
          p_end_date: '2026-09-30',
        }),
      );
    });
  });
});
