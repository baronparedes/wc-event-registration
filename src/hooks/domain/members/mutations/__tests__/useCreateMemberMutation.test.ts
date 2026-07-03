import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';
import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useCreateMemberMutation } from '@/hooks/domain/members/mutations/useCreateMemberMutation';
import { ADMIN_MEMBERS_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMembersQuery';

const { mockCreateCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const createCaller = vi.fn();
  return {
    mockCreateCaller: createCaller,
    mockCreateEdgeFunctionCaller: vi.fn(() => createCaller),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
  };
});

describe('useCreateMemberMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a member and invalidates admin members query', async () => {
    const member = makeAdminMember({ role: 'player', category: 'adult' });
    mockCreateCaller.mockResolvedValueOnce({
      success: true,
      id: member.id,
      member_id: member.member_id,
      full_name: member.full_name,
    });

    const { result, queryClient } = renderHookWithClient(() => useCreateMemberMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const response = await act(async () =>
      result.current.mutateAsync({
        member_id: member.member_id,
        first_name: member.first_name ?? '',
        last_name: member.last_name ?? '',
        nickname: '',
        email: member.email ?? '',
        phone: '',
        date_of_birth: '',
        role: member.role,
        category: member.category,
      }),
    );

    expect(response.member_id).toBe(member.member_id);
    expect(mockCreateCaller).toHaveBeenCalledWith(
      expect.objectContaining({ member_id: member.member_id, first_name: member.first_name }),
    );

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
    });
  });
});
