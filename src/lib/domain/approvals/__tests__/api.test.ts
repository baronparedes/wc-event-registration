import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/lib/infrastructure';

import {
  delegateApproval,
  fetchApprovalRequestById,
  fetchApprovalRequests,
  fetchApprovalReviewByToken,
  fetchSlodUsers,
  submitApprovalDecision,
} from '../api';

const { mockCaller, mockCreateEdgeFunctionCaller, mockFrom, mockRpc } = vi.hoisted(() => {
  const caller = vi.fn();
  return {
    mockCaller: caller,
    mockCreateEdgeFunctionCaller: vi.fn(() => caller),
    mockFrom: vi.fn(),
    mockRpc: vi.fn(),
  };
});

vi.mock('@/lib/infrastructure', () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
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
      expect(result).toEqual([
        {
          ...mockData[0],
          requester_avatar_object_key: null,
        },
      ]);
    });

    it('resolves requester avatar from metadata when user relation is absent', async () => {
      const mockData = [
        {
          id: 'appr-2',
          entity_type: 'recruitment_endorsement',
          title: 'DGroup Leader Endorsement',
          status: 'pending',
          metadata: { avatar_object_key: 'avatars/recruitment/jane.jpg' },
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

      const result = await fetchApprovalRequests();
      expect(result).toEqual([
        {
          ...mockData[0],
          requester_avatar_object_key: 'avatars/recruitment/jane.jpg',
        },
      ]);
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
      expect(result).toEqual({ ...mockRecord, requester_avatar_object_key: null });
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

      const attestationAnswers = {
        leader_full_name: 'Test DGroup Leader',
        recommendation_decision: 'Yes',
      };

      const result = await submitApprovalDecision({
        token: 'token-123',
        decision: 'approved',
        notes: 'Looks good',
        attestation_answers: attestationAnswers,
      });

      expect(mockCaller).toHaveBeenCalledWith({
        action: 'submit_decision',
        token: 'token-123',
        approval_id: undefined,
        decision: 'approved',
        notes: 'Looks good',
        reviewer_email: undefined,
        attestation_answers: attestationAnswers,
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

    it.each([
      {
        requester_user: { avatar_object_key: 'avatars/user.jpg' },
        metadata: { avatar_object_key: 'avatars/meta.jpg' },
        expected: 'avatars/user.jpg',
      },
      {
        requester_user: null,
        metadata: { avatar_object_key: ' avatars/meta.jpg ' },
        expected: 'avatars/meta.jpg',
      },
      { metadata: { avatar_object_key: '   ' }, expected: null },
      { metadata: { avatar_object_key: 42 }, expected: null },
      { metadata: [], expected: null },
      { metadata: 'invalid', expected: null },
      { metadata: null, expected: null },
    ])(
      'resolves requester avatars consistently in lists and details: %j',
      async ({ expected, ...row }) => {
        const response = { data: [row], error: null };
        const query = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: row, error: null }),
          then: Promise.resolve(response).then.bind(Promise.resolve(response)),
        };
        mockFrom.mockReturnValue(query);
        await expect(
          fetchApprovalRequests({ status: 'all', entity_type: 'all', search: '  ' }),
        ).resolves.toEqual([{ ...row, requester_avatar_object_key: expected }]);
        expect(query.eq).not.toHaveBeenCalled();
        await expect(fetchApprovalRequestById('approval-1')).resolves.toEqual({
          ...row,
          requester_avatar_object_key: expected,
        });
      },
    );

    it('returns an empty list when no approval rows are returned', async () => {
      const response = { data: null, error: null };
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: Promise.resolve(response).then.bind(Promise.resolve(response)),
      });
      await expect(fetchApprovalRequests()).resolves.toEqual([]);
    });

    it('defaults absent review entity details to null', async () => {
      const approval = { id: 'approval-1', title: 'Review', status: 'pending' };
      mockCaller.mockResolvedValue({ success: true, approval });
      await expect(fetchApprovalReviewByToken('token')).resolves.toEqual({
        approval,
        entity_details: null,
      });
    });

    it.each([{ success: false }, { success: true }])(
      'rejects incomplete review responses: %j',
      async (response) => {
        mockCaller.mockResolvedValue(response);
        await expect(fetchApprovalReviewByToken('token')).rejects.toThrow(
          'Failed to fetch approval review details',
        );
      },
    );

    it.each(['approved', 'rejected'] as const)(
      'uses decision defaults for %s',
      async (decision) => {
        mockCaller.mockResolvedValue({ success: true, result: { recorded: true } });
        await expect(submitApprovalDecision({ token: 'token', decision })).resolves.toEqual({
          success: true,
          message: `Decision recorded as ${decision}`,
          status: decision,
          result: { recorded: true },
        });
      },
    );

    it.each([
      [{ success: false, error: 'Forbidden' }, 'Forbidden'],
      [{ success: false }, 'Failed to submit approval decision'],
    ])('propagates decision errors %j', async (response, message) => {
      mockCaller.mockResolvedValue(response);
      await expect(
        submitApprovalDecision({ token: 'token', decision: 'approved' }),
      ).rejects.toThrow(message);
    });

    it('fetches SLOD users and handles empty data and RPC errors', async () => {
      const users = [{ id: 'user-1', full_name: 'Test Reviewer', email: 'reviewer@example.com' }];
      mockRpc.mockResolvedValueOnce({ data: users, error: null });
      await expect(fetchSlodUsers()).resolves.toEqual(users);
      expect(mockRpc).toHaveBeenCalledWith('list_slod_users');
      mockRpc.mockResolvedValueOnce({ data: null, error: null });
      await expect(fetchSlodUsers()).resolves.toEqual([]);
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Unavailable' } });
      await expect(fetchSlodUsers()).rejects.toThrow('Failed to fetch SLOD users: Unavailable');
    });

    it('delegates approval with explicit and fallback messages', async () => {
      const input = {
        approval_id: 'approval-1',
        assigned_to_user_id: 'user-1',
        assigned_to_email: 'reviewer@example.com',
      };
      mockCaller.mockResolvedValueOnce({ success: true, message: 'Delegated successfully' });
      await expect(delegateApproval(input)).resolves.toEqual({
        success: true,
        message: 'Delegated successfully',
        approval_id: input.approval_id,
        assigned_to_email: input.assigned_to_email,
      });
      expect(mockCaller).toHaveBeenCalledWith({ action: 'delegate_approval', ...input });
      mockCaller.mockResolvedValueOnce({ success: true });
      await expect(delegateApproval(input)).resolves.toMatchObject({
        message: `Approval delegated to ${input.assigned_to_email}`,
      });
    });

    it.each([
      [{ success: false, error: 'Forbidden' }, 'Forbidden'],
      [{ success: false }, 'Failed to delegate approval'],
    ])('propagates delegation errors %j', async (response, message) => {
      mockCaller.mockResolvedValue(response);
      await expect(
        delegateApproval({ approval_id: 'approval-1', assigned_to_email: 'reviewer@example.com' }),
      ).rejects.toThrow(message);
    });
  });
});
