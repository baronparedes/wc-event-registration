import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAddMemberNoteMutation } from '@/hooks/domain/members/mutations/useAddMemberNoteMutation';
import { ADMIN_MEMBER_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMemberQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMembersQuery';

const { mockAddMemberNote, mockGetSession } = vi.hoisted(() => ({
  mockAddMemberNote: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock('@/lib/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/domain/members')>('@/lib/domain/members');
  return {
    ...actual,
    addMemberNote: mockAddMemberNote,
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    supabase: {
      auth: {
        getSession: mockGetSession,
      },
    },
  };
});

describe('useAddMemberNoteMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds note using full_name from session and invalidates queries on success', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            user_metadata: { full_name: 'Test Admin User' },
          },
        },
      },
    });
    mockAddMemberNote.mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithClient(() => useAddMemberNoteMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({
        memberId: 'member-123',
        text: 'Test note content',
      });
    });

    expect(mockAddMemberNote).toHaveBeenCalledWith(
      'member-123',
      'Test note content',
      'admin-1',
      'Test Admin User',
    );

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ADMIN_MEMBER_QUERY_KEY('member-123'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ADMIN_MEMBERS_QUERY_KEY(),
      });
    });
  });

  it('falls back to email or Admin when full_name is absent in session metadata', async () => {
    // 1. Fallback to email
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: 'admin-2',
            email: 'staff@example.com',
            user_metadata: {},
          },
        },
      },
    });
    mockAddMemberNote.mockResolvedValueOnce(undefined);

    const { result } = renderHookWithClient(() => useAddMemberNoteMutation());

    await act(async () => {
      await result.current.mutateAsync({
        memberId: 'member-123',
        text: 'Test note',
      });
    });

    expect(mockAddMemberNote).toHaveBeenCalledWith(
      'member-123',
      'Test note',
      'admin-2',
      'staff@example.com',
    );

    // 2. Fallback to Admin when no email
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: 'admin-3',
            email: '',
            user_metadata: null,
          },
        },
      },
    });
    mockAddMemberNote.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.mutateAsync({
        memberId: 'member-123',
        text: 'Another note',
      });
    });

    expect(mockAddMemberNote).toHaveBeenCalledWith(
      'member-123',
      'Another note',
      'admin-3',
      'Admin',
    );
  });

  it('throws error when user is not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    const { result } = renderHookWithClient(() => useAddMemberNoteMutation());

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          memberId: 'member-123',
          text: 'Note text',
        });
      }),
    ).rejects.toThrow('Not authenticated');

    expect(mockAddMemberNote).not.toHaveBeenCalled();
  });
});
