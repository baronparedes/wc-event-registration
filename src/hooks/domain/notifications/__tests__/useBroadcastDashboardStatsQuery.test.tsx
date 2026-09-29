import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/lib/infrastructure';

import { useBroadcastDashboardStatsQuery } from '../useBroadcastDashboardStatsQuery';

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    supabase: {
      rpc: vi.fn(),
    },
  };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useBroadcastDashboardStatsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns broadcast dashboard stats from the RPC', async () => {
    const stats = {
      total_users: 10,
      subscribed_users: 3,
      campaigns: [],
    };
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: stats, error: null } as never);

    const { result } = renderHook(() => useBroadcastDashboardStatsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(stats);
    expect(supabase.rpc).toHaveBeenCalledWith('get_broadcast_dashboard_stats');
  });

  it('exposes RPC errors through the query result', async () => {
    const rpcError = new Error('Dashboard stats unavailable');
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: rpcError } as never);

    const { result } = renderHook(() => useBroadcastDashboardStatsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(rpcError);
  });
});
