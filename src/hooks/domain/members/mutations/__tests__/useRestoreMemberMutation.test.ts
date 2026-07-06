import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useRestoreMemberMutation } from '@/hooks/domain/members/mutations/useRestoreMemberMutation';
import { ADMIN_MEMBER_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMemberQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '@/hooks/domain/members/queries/useAdminMembersQuery';

const { mockUpdateBuilder, mockFrom } = vi.hoisted(() => {
  const updateBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn(),
  };

  updateBuilder.update.mockReturnValue(updateBuilder);
  updateBuilder.eq.mockReturnValue(updateBuilder);
  updateBuilder.select.mockReturnValue(updateBuilder);

  const from = vi.fn((table: string) => {
    if (table !== 'users') throw new Error(`Unexpected table: ${table}`);
    return {
      update: updateBuilder.update,
      eq: updateBuilder.eq,
      select: updateBuilder.select,
      maybeSingle: updateBuilder.maybeSingle,
    };
  });

  return {
    mockUpdateBuilder: updateBuilder,
    mockFrom: from,
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    supabase: {
      from: mockFrom,
    },
  };
});

describe('useRestoreMemberMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks member active and invalidates list/detail queries', async () => {
    const userId = faker.string.uuid();
    mockUpdateBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: userId },
      error: null,
    });

    const { result, queryClient } = renderHookWithClient(() => useRestoreMemberMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({ id: userId });
    });

    expect(mockUpdateBuilder.update).toHaveBeenCalledWith({ is_active: true });
    expect(mockUpdateBuilder.eq).toHaveBeenCalledWith('id', userId);
    expect(mockUpdateBuilder.eq).toHaveBeenCalledWith('is_active', false);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_MEMBER_QUERY_KEY(userId) });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin-member', userId, true] });
    });
  });

  it('throws when member is not found', async () => {
    mockUpdateBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() => useRestoreMemberMutation());

    await expect(result.current.mutateAsync({ id: faker.string.uuid() })).rejects.toThrow(
      'Member not found',
    );
  });

  it('throws when restore fails', async () => {
    mockUpdateBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error('restore failed'),
    });

    const { result } = renderHookWithClient(() => useRestoreMemberMutation());

    await expect(result.current.mutateAsync({ id: faker.string.uuid() })).rejects.toThrow(
      'restore failed',
    );
  });
});
