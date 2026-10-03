import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '@/lib/domain/notifications/api';
import type { SundaySchedulePreview } from '@/lib/domain/notifications/types';

import { useSundaySchedulePreviewQuery } from '../useSundaySchedulePreviewQuery';

vi.mock('@/lib/domain/notifications/api', () => ({
  getSundaySchedulePreview: vi.fn(),
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

describe('useSundaySchedulePreviewQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches preview data for nearest upcoming Sunday by default', async () => {
    const mockPreview: SundaySchedulePreview = {
      sunday_date: '2026-10-04',
      ordinal: 1,
      sunday_key: 'first_sunday',
      already_sent_push: false,
      push_sent_at: null,
      already_sent_email: false,
      email_sent_at: null,
      total_volunteers: 12,
      push_eligible_count: 8,
      email_eligible_count: 12,
      volunteers: [
        {
          user_id: 'user-1',
          member_id: 'MEM-001',
          full_name: 'Test Volunteer',
          email: 'test.volunteer@example.com',
          formatted_slots: '9:00 AM',
          has_push: true,
          has_email: true,
        },
      ],
    };

    vi.mocked(api.getSundaySchedulePreview).mockResolvedValueOnce(mockPreview);

    const { result } = renderHook(() => useSundaySchedulePreviewQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPreview);
    expect(api.getSundaySchedulePreview).toHaveBeenCalledWith(undefined);
  });

  it('fetches preview data for a specific target date', async () => {
    const mockPreview: SundaySchedulePreview = {
      sunday_date: '2026-10-11',
      ordinal: 2,
      sunday_key: 'second_sunday',
      already_sent_push: true,
      push_sent_at: '2026-10-09T22:00:00Z',
      already_sent_email: true,
      email_sent_at: '2026-10-09T22:00:00Z',
      total_volunteers: 10,
      push_eligible_count: 6,
      email_eligible_count: 10,
      volunteers: [],
    };

    vi.mocked(api.getSundaySchedulePreview).mockResolvedValueOnce(mockPreview);

    const { result } = renderHook(
      () => useSundaySchedulePreviewQuery({ targetSundayDate: '2026-10-11' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPreview);
    expect(api.getSundaySchedulePreview).toHaveBeenCalledWith('2026-10-11');
  });
});
