import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '@/lib/domain/notifications/api';

import { useBroadcastDraftAi } from '../useBroadcastDraftAi';

vi.mock('@/lib/domain/notifications/api', () => ({
  generateBroadcastDraft: vi.fn(),
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

describe('useBroadcastDraftAi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers generateBroadcastDraft with payload and returns draft on success', async () => {
    const mockDraftResponse = {
      success: true,
      draft: {
        title: 'Sunday Reminder',
        message: 'Doors open at 9 AM for fellowship.',
      },
    };

    vi.mocked(api.generateBroadcastDraft).mockResolvedValueOnce(mockDraftResponse);

    const { result } = renderHook(() => useBroadcastDraftAi(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({
        mode: 'new',
        notes: 'Sunday service at 9 AM',
        tone: 'pastoral',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.generateBroadcastDraft).toHaveBeenCalledWith({
      mode: 'new',
      notes: 'Sunday service at 9 AM',
      tone: 'pastoral',
    });
    expect(result.current.data).toEqual(mockDraftResponse);
  });

  it('handles generation errors', async () => {
    vi.mocked(api.generateBroadcastDraft).mockRejectedValueOnce(
      new Error('Failed to generate broadcast draft'),
    );

    const { result } = renderHook(() => useBroadcastDraftAi(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({
        mode: 'polish',
        notes: 'Some raw announcement',
        tone: 'urgent',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Failed to generate broadcast draft');
  });
});
