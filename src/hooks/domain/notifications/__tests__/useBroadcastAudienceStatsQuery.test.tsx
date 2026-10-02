import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '@/lib/domain/notifications/api';

import { useBroadcastAudienceStatsQuery } from '../useBroadcastAudienceStatsQuery';

vi.mock('@/lib/domain/notifications/api', () => ({
  getBroadcastAudienceStats: vi.fn(),
}));

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

describe('useBroadcastAudienceStatsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches audience stats for an event target', async () => {
    const stats = {
      total_recipients: 50,
      email_recipients_count: 45,
      push_recipients_count: 30,
      registered_members_count: 35,
      public_registrants_count: 15,
    };
    vi.mocked(api.getBroadcastAudienceStats).mockResolvedValueOnce(stats);

    const { result } = renderHook(
      () =>
        useBroadcastAudienceStatsQuery({
          targetType: 'event',
          targetEventId: 'event-123',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(stats);
    expect(api.getBroadcastAudienceStats).toHaveBeenCalledWith({
      targetType: 'event',
      targetRoles: undefined,
      targetUserId: undefined,
      targetEventId: 'event-123',
    });
  });

  it('does not trigger query when event ID is missing for event targetType', () => {
    const { result } = renderHook(
      () =>
        useBroadcastAudienceStatsQuery({
          targetType: 'event',
          targetEventId: null,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(api.getBroadcastAudienceStats).not.toHaveBeenCalled();
  });
});
