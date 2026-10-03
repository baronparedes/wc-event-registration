import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '@/lib/domain/notifications/api';

import { useDispatchSundayRemindersMutation } from '../useDispatchSundayRemindersMutation';
import { SUNDAY_SCHEDULE_PREVIEW_QUERY_KEY } from '../useSundaySchedulePreviewQuery';

vi.mock('@/lib/domain/notifications/api', () => ({
  dispatchSundayReminders: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useDispatchSundayRemindersMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers dispatch mutation and invalidates preview queries', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    vi.mocked(api.dispatchSundayReminders).mockResolvedValueOnce({
      success: true,
      sunday_date: '2026-10-04',
      push_enqueued: 8,
      email_enqueued: 12,
    });

    const { result } = renderHook(() => useDispatchSundayRemindersMutation(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({
      targetSundayDate: '2026-10-04',
      channels: ['push', 'email'],
      force: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.dispatchSundayReminders).toHaveBeenCalledWith({
      targetSundayDate: '2026-10-04',
      channels: ['push', 'email'],
      force: true,
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: SUNDAY_SCHEDULE_PREVIEW_QUERY_KEY,
    });
  });
});
