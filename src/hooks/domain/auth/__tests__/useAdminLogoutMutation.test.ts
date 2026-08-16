import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAdminLogoutMutation } from '@/hooks/domain/auth/useAdminLogoutMutation';
import { ADMIN_AUTH_QUERY_KEY } from '@/lib/domain/auth';

const { mockClearOfflineAttendanceData, mockSignOut } = vi.hoisted(() => ({
  mockClearOfflineAttendanceData: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    clearOfflineAttendanceData: mockClearOfflineAttendanceData,
    supabase: {
      auth: {
        signOut: mockSignOut,
      },
    },
  };
});

describe('useAdminLogoutMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClearOfflineAttendanceData.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('signs out, clears cached auth state, and invalidates auth query', async () => {
    const { result, queryClient } = renderHookWithClient(() => useAdminLogoutMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    queryClient.setQueryData(ADMIN_AUTH_QUERY_KEY, {
      isAuthenticated: true,
      session: { user: { id: 'auth-1' } },
      adminRole: 'admin',
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockClearOfflineAttendanceData).toHaveBeenCalledOnce();

    expect(queryClient.getQueryData(ADMIN_AUTH_QUERY_KEY)).toEqual({
      isAuthenticated: false,
      session: null,
      adminRole: null,
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_AUTH_QUERY_KEY });
    });
  });

  it('throws when signOut returns an error', async () => {
    const signOutError = new Error('network issue');
    mockSignOut.mockResolvedValueOnce({ error: signOutError });

    const { result, queryClient } = renderHookWithClient(() => useAdminLogoutMutation());

    await expect(result.current.mutateAsync()).rejects.toThrow('network issue');

    expect(mockClearOfflineAttendanceData).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(ADMIN_AUTH_QUERY_KEY)).toBeUndefined();
  });
});
