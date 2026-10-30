import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '@/lib/domain/hub-calendar/api';

import { useRecommendStandInMutation } from '../useRecommendStandInMutation';

vi.mock('@/lib/domain/hub-calendar/api', () => ({
  recommendStandIn: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useRecommendStandInMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers recommendStandIn with payload and returns response on success', async () => {
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

    vi.mocked(api.recommendStandIn).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useRecommendStandInMutation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        targetDate: '2026-11-01',
        timeSlot: '9AM',
        role: 'Prayer Coach',
        candidates: [{ token: 'USR_001', turnupRate: 90, attendanceScore: 10, tier: 'solid' }],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.recommendStandIn).toHaveBeenCalledWith({
      targetDate: '2026-11-01',
      timeSlot: '9AM',
      role: 'Prayer Coach',
      candidates: [{ token: 'USR_001', turnupRate: 90, attendanceScore: 10, tier: 'solid' }],
    });
    expect(result.current.data).toEqual(mockResponse);
  });

  it('handles recommendation errors gracefully', async () => {
    vi.mocked(api.recommendStandIn).mockRejectedValueOnce(
      new Error('Failed to generate stand-in recommendation'),
    );

    const { result } = renderHook(() => useRecommendStandInMutation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        targetDate: '2026-11-01',
        timeSlot: '9AM',
        role: 'Prayer Coach',
        candidates: [{ token: 'USR_001', turnupRate: 90, attendanceScore: 10, tier: 'solid' }],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Failed to generate stand-in recommendation');
  });
});
