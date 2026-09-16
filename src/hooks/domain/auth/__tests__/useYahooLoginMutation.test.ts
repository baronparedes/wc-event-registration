import type { Provider } from '@supabase/supabase-js';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';

import { useYahooLoginMutation } from '../useYahooLoginMutation';

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

describe('useYahooLoginMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase.auth.signInWithOAuth with yahoo provider and default redirect', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'yahoo' as Provider, url: 'https://accounts.yahoo.com/o/oauth2/v2/auth' },
      error: null,
    });

    const { result } = renderHookWithClient(() => useYahooLoginMutation());

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'yahoo' as Provider,
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
  });

  it('calls supabase.auth.signInWithOAuth with custom redirectTo option', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'yahoo' as Provider, url: 'https://accounts.yahoo.com/o/oauth2/v2/auth' },
      error: null,
    });

    const { result } = renderHookWithClient(() => useYahooLoginMutation());

    await act(async () => {
      await result.current.mutateAsync({ redirectTo: '/login?redirect=%2Fadmin%2Fevents' });
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'yahoo' as Provider,
      options: {
        redirectTo: `${window.location.origin}/login?redirect=%2Fadmin%2Fevents`,
      },
    });
  });

  it('throws when supabase.auth.signInWithOAuth returns an error', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'yahoo' as Provider, url: null },
      error: new Error('OAuth error'),
    });

    const { result } = renderHookWithClient(() => useYahooLoginMutation());

    await expect(
      act(async () => {
        await result.current.mutateAsync({});
      }),
    ).rejects.toThrow('OAuth error');
  });
});
