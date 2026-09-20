import { createElement } from 'react';
import type { PropsWithChildren } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useResolveUserTokensQuery, useUserTokenMapQuery } from '../useResolveUserTokensQuery';

const { mockCallResolveTokens } = vi.hoisted(() => ({
  mockCallResolveTokens: vi.fn(),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    createEdgeFunctionCaller: () => mockCallResolveTokens,
  };
});

describe('useResolveUserTokensQuery & useUserTokenMapQuery (in-memory React Query)', () => {
  let queryClient: QueryClient;

  function createWrapper() {
    return ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it('fetches all tokens once and stores in React Query memory without using sessionStorage', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    mockCallResolveTokens.mockResolvedValueOnce({
      success: true,
      data: {
        USR_000001: { id: 'user-1', name: 'Alice' },
        USR_000002: { id: 'user-2', name: 'Bob' },
      },
    });

    const { result } = renderHook(() => useUserTokenMapQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        USR_000001: { id: 'user-1', name: 'Alice' },
        USR_000002: { id: 'user-2', name: 'Bob' },
      });
    });

    expect(mockCallResolveTokens).toHaveBeenCalledTimes(1);
    expect(mockCallResolveTokens).toHaveBeenCalledWith({});
    // Ensures sessionStorage is not used for storing tokens
    expect(setItemSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('token'),
      expect.any(String),
    );
    setItemSpy.mockRestore();
  });

  it('reuses in-memory React Query cache across multiple components with zero extra network calls', async () => {
    mockCallResolveTokens.mockResolvedValueOnce({
      success: true,
      data: {
        USR_000001: { id: 'user-1', name: 'Alice' },
        USR_000002: { id: 'user-2', name: 'Bob' },
      },
    });

    const wrapper = createWrapper();

    const hook1 = renderHook(() => useUserTokenMapQuery(), { wrapper });
    await waitFor(() => {
      expect(hook1.result.current.data).toBeDefined();
    });

    // Render a second hook within the same queryClient lifecycle
    const hook2 = renderHook(() => useResolveUserTokensQuery(['USR_000001']), { wrapper });

    expect(hook2.result.current.data).toEqual({
      USR_000001: { id: 'user-1', name: 'Alice' },
    });

    // Still only 1 network call was ever made!
    expect(mockCallResolveTokens).toHaveBeenCalledTimes(1);
  });

  it('resolves tokens subset correctly on the frontend', async () => {
    mockCallResolveTokens.mockResolvedValueOnce({
      success: true,
      data: {
        USR_000001: { id: 'user-1', name: 'Alice' },
        USR_000002: { id: 'user-2', name: 'Bob' },
        USR_000003: { id: 'user-3', name: 'Charlie' },
      },
    });

    const wrapper = createWrapper();
    const hook = renderHook(() => useResolveUserTokensQuery(['USR_000001', 'USR_000003']), {
      wrapper,
    });

    await waitFor(() => {
      expect(hook.result.current.data).toEqual({
        USR_000001: { id: 'user-1', name: 'Alice' },
        USR_000003: { id: 'user-3', name: 'Charlie' },
      });
    });

    expect(mockCallResolveTokens).toHaveBeenCalledTimes(1);
  });
});
