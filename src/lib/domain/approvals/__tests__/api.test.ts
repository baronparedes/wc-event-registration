import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/lib/infrastructure';

import {
  fetchApprovalRequestById,
  fetchApprovalRequests,
  fetchApprovalReviewByToken,
  submitApprovalDecision,
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

describe('approvals API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchApprovalRequests', () => {
    it('applies filters and returns approval requests', async () => {
      const mockData = [
        {
          id: 'appr-1',
          entity_type: 'form_submission',
          title: 'Volunteer Application',
          status: 'pending',
        },
      ];

      const query = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown) => void) => resolve({ data: mockData, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(query as never);

      const result = await fetchApprovalRequests({
        status: 'pending',
        entity_type: 'form_submission',
        search: 'Volunteer',
      });

      expect(supabase.from).toHaveBeenCalledWith('approval_requests');
      expect(query.eq).toHaveBeenCalledWith('status', 'pending');
      expect(query.eq).toHaveBeenCalledWith('entity_type', 'form_submission');
      expect(query.or).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it('throws error when query fails', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown) => void) =>
          resolve({ data: null, error: { message: 'Network error' } }),
      };

      vi.mocked(supabase.from).mockReturnValue(query as never);

      await expect(fetchApprovalRequests()).rejects.toThrow(
        'Failed to fetch approval requests: Network error',
      );
    });
  });

  describe('fetchApprovalRequestById', () => {
    it('returns single approval request', async () => {
      const mockRecord = { id: 'appr-1', title: 'Test Request' };
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(query as never);

      const result = await fetchApprovalRequestById('appr-1');
      expect(result).toEqual(mockRecord);
      expect(query.eq).toHaveBeenCalledWith('id', 'appr-1');
    });

    it('throws error if record not found', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };

      vi.mocked(supabase.from).mockReturnValue(query as never);

      await expect(fetchApprovalRequestById('non-existent')).rejects.toThrow(
        'Failed to fetch approval request: Not found',
      );
    });
  });

  describe('fetchApprovalReviewByToken', () => {
    it('calls edge function and returns review data', async () => {
      mockCaller.mockResolvedValueOnce({
        success: true,
        approval: {
          id: 'appr-1',
          title: 'Leave Request',
          status: 'pending',
        },
        entity_details: { reason: 'Mission trip' },
      });

      const result = await fetchApprovalReviewByToken('valid-token');
      expect(mockCaller).toHaveBeenCalledWith({
        action: 'get_review_data',
        token: 'valid-token',
      });
      expect(result.approval.title).toBe('Leave Request');
      expect(result.entity_details).toEqual({ reason: 'Mission trip' });
    });

    it('throws error if edge function returns failure', async () => {
      mockCaller.mockResolvedValueOnce({
        success: false,
        error: 'Token expired',
      });

      await expect(fetchApprovalReviewByToken('expired-token')).rejects.toThrow('Token expired');
    });
  });

  describe('submitApprovalDecision', () => {
    it('submits decision through edge function', async () => {
      mockCaller.mockResolvedValueOnce({
        success: true,
        message: 'Request successfully approved',
        status: 'approved',
      });

      const result = await submitApprovalDecision({
        token: 'token-123',
        decision: 'approved',
        notes: 'Looks good',
      });

      expect(mockCaller).toHaveBeenCalledWith({
        action: 'submit_decision',
        token: 'token-123',
        approval_id: undefined,
        decision: 'approved',
        notes: 'Looks good',
        reviewer_email: undefined,
      });
      expect(result.success).toBe(true);
      expect(result.status).toBe('approved');
    });

    it('validates required fields before calling edge function', async () => {
      await expect(
        submitApprovalDecision({
          // missing both token and approval_id
          decision: 'approved',
        } as never),
      ).rejects.toThrow();
    });
  });
});
