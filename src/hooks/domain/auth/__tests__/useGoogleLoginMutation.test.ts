import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useGoogleLoginMutation } from '../useGoogleLoginMutation';
import { supabase } from '@/lib/infrastructure';

const { mockSignInWithOAuth } = vi.hoisted(() => ({
  mockSignInWithOAuth: vi.fn(),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    supabase: {
      auth: {
        signInWithOAuth: mockSignInWithOAuth,
      },
    },
  };
});

describe('useGoogleLoginMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase.auth.signInWithOAuth with google provider and default redirect', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2/v2/auth' },
      error: null,
    });

    const { result } = renderHookWithClient(() => useGoogleLoginMutation());

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
  });

  it('calls supabase.auth.signInWithOAuth with custom redirectTo option', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2/v2/auth' },
      error: null,
    });

    const { result } = renderHookWithClient(() => useGoogleLoginMutation());

    await act(async () => {
      await result.current.mutateAsync({ redirectTo: '/login?redirect=%2Fadmin%2Fevents' });
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login?redirect=%2Fadmin%2Fevents`,
      },
    });
  });

  it('throws when supabase.auth.signInWithOAuth returns an error', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'google', url: null },
      error: new Error('OAuth error'),
    });

    const { result } = renderHookWithClient(() => useGoogleLoginMutation());

    await expect(
      act(async () => {
        await result.current.mutateAsync();
      }),
    ).rejects.toThrow('OAuth error');
  });
});
