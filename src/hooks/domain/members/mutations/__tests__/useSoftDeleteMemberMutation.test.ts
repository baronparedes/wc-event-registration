import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useSoftDeleteMemberMutation } from '@/hooks/domain/members/mutations/useSoftDeleteMemberMutation';
import { ADMIN_MEMBER_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMemberQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMembersQuery';

const { mockSetMemberActiveStatus } = vi.hoisted(() => ({
  mockSetMemberActiveStatus: vi.fn(),
}));

vi.mock('@/lib/domain/members', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/domain/members')>();
  return {
    ...actual,
    setMemberActiveStatus: mockSetMemberActiveStatus,
  };
});

describe('useSoftDeleteMemberMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('soft deletes a member and invalidates queries on success', async () => {
    mockSetMemberActiveStatus.mockResolvedValueOnce({ id: 'member-123' });

    const { result, queryClient } = renderHookWithClient(() => useSoftDeleteMemberMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({ id: 'member-123' });
    });

    expect(mockSetMemberActiveStatus).toHaveBeenCalledWith('member-123', false);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBER_QUERY_KEY('member-123') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin-member', 'member-123', true] });
  });

  it('throws an error if member is not found', async () => {
    mockSetMemberActiveStatus.mockResolvedValueOnce(null);

    const { result } = renderHookWithClient(() => useSoftDeleteMemberMutation());

    await expect(
      act(async () => {
        await result.current.mutateAsync({ id: 'member-123' });
      }),
    ).rejects.toThrow('Member not found');
  });

  it('propagates API errors', async () => {
    mockSetMemberActiveStatus.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHookWithClient(() => useSoftDeleteMemberMutation());

    await expect(
      act(async () => {
        await result.current.mutateAsync({ id: 'member-123' });
      }),
    ).rejects.toThrow('API Error');
  });
});
