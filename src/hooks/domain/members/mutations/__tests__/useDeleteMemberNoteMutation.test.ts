import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useDeleteMemberNoteMutation } from '@/hooks/domain/members/mutations/useDeleteMemberNoteMutation';
import { ADMIN_MEMBER_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMemberQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMembersQuery';

const { mockDeleteMemberNote } = vi.hoisted(() => ({
  mockDeleteMemberNote: vi.fn(),
}));

vi.mock('@/lib/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/domain/members')>('@/lib/domain/members');
  return {
    ...actual,
    deleteMemberNote: mockDeleteMemberNote,
  };
});

describe('useDeleteMemberNoteMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes member note and invalidates queries on success', async () => {
    mockDeleteMemberNote.mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithClient(() => useDeleteMemberNoteMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({
        memberId: 'member-123',
        noteId: 'note-456',
      });
    });

    expect(mockDeleteMemberNote).toHaveBeenCalledWith('member-123', 'note-456');

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ADMIN_MEMBER_QUERY_KEY('member-123'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ADMIN_MEMBERS_QUERY_KEY(),
      });
    });
  });

  it('propagates error when deleteMemberNote fails', async () => {
    mockDeleteMemberNote.mockRejectedValueOnce(new Error('Deletion failed'));

    const { result } = renderHookWithClient(() => useDeleteMemberNoteMutation());

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          memberId: 'member-123',
          noteId: 'note-456',
        });
      }),
    ).rejects.toThrow('Deletion failed');
  });
});
