import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '@/lib/domain/hub-calendar/api';

import {
  DEFAULT_STAND_IN_CACHE_STALE_TIME,
  STAND_IN_RECOMMENDATIONS_QUERY_KEY,
  useRecommendStandInQuery,
} from '../useRecommendStandInQuery';

vi.mock('@/lib/domain/hub-calendar/api', () => ({
  recommendStandIn: vi.fn(),
}));

const mockResponse: api.RecommendStandInResponse = {
  recommendations: [
    {
      candidateToken: 'USR_001',
      rank: 1,
      reasoning: 'High turnup rate and regular attendee.',
    },
  ],
  invitations: {
    viber: 'Hi {{volunteer_name}}, can you walk in as {{role}}?',
    sms: 'Hi {{volunteer_name}}, can you serve as {{role}}?',
    whatsapp: 'Hi {{volunteer_name}}, open shift for {{role}}!',
    email: {
      subject: 'Walk-in request',
      body: 'Hi {{volunteer_name}}, please let us know.',
    },
  },
};

const samplePayload: api.RecommendStandInPayload = {
  targetDate: '2026-11-01',
  timeSlot: '9AM',
  role: 'Prayer Coach',
  neededCount: 2,
  candidates: [{ token: 'USR_001', turnupRate: 90, attendanceScore: 10, tier: 'solid' }],
};

function createWrapper(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useRecommendStandInQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds query key accurately with all parameters', () => {
    const key = STAND_IN_RECOMMENDATIONS_QUERY_KEY(
      '2026-11-01',
      '9AM',
      'Prayer Coach',
      'MEM_123',
      3,
      'USR_001,USR_002',
    );
    expect(key).toEqual([
      'stand-in-recommendations',
      '2026-11-01',
      '9AM',
      'Prayer Coach',
      'MEM_123',
      3,
      'USR_001,USR_002',
    ]);
  });

  it('fetches and returns stand-in recommendations on success', async () => {
    vi.mocked(api.recommendStandIn).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useRecommendStandInQuery(samplePayload, { enabled: true }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.recommendStandIn).toHaveBeenCalledTimes(1);
    expect(api.recommendStandIn).toHaveBeenCalledWith(samplePayload);
    expect(result.current.data).toEqual(mockResponse);
  });

  it('serves results from cache without re-calling API when called with identical payload', async () => {
    vi.mocked(api.recommendStandIn).mockResolvedValue(mockResponse);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: DEFAULT_STAND_IN_CACHE_STALE_TIME,
        },
      },
    });

    const wrapper = createWrapper(queryClient);

    // First render: triggers fetch
    const { result: firstResult } = renderHook(
      () => useRecommendStandInQuery(samplePayload, { enabled: true }),
      { wrapper },
    );

    await waitFor(() => expect(firstResult.current.isSuccess).toBe(true));
    expect(api.recommendStandIn).toHaveBeenCalledTimes(1);

    // Second render (simulating modal reopening with identical payload): serves from cache
    const { result: secondResult } = renderHook(
      () => useRecommendStandInQuery(samplePayload, { enabled: true }),
      { wrapper },
    );

    expect(secondResult.current.data).toEqual(mockResponse);
    // recommendStandIn should NOT have been called a second time
    expect(api.recommendStandIn).toHaveBeenCalledTimes(1);
  });

  it('does not execute query when enabled is false or candidates list is empty', async () => {
    const { result } = renderHook(
      () => useRecommendStandInQuery(samplePayload, { enabled: false }),
      { wrapper: createWrapper() },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(api.recommendStandIn).not.toHaveBeenCalled();

    const emptyCandidatesPayload: api.RecommendStandInPayload = {
      ...samplePayload,
      candidates: [],
    };

    const { result: emptyResult } = renderHook(
      () => useRecommendStandInQuery(emptyCandidatesPayload, { enabled: true }),
      { wrapper: createWrapper() },
    );

    expect(emptyResult.current.fetchStatus).toBe('idle');
    expect(api.recommendStandIn).not.toHaveBeenCalled();
  });

  it('re-fetches when refetch() is explicitly called', async () => {
    vi.mocked(api.recommendStandIn).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useRecommendStandInQuery(samplePayload, { enabled: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.recommendStandIn).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(api.recommendStandIn).toHaveBeenCalledTimes(2);
  });

  it('surfaces query errors gracefully', async () => {
    vi.mocked(api.recommendStandIn).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(
      () => useRecommendStandInQuery(samplePayload, { enabled: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });
});
