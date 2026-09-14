import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { supabase } from '@/lib/infrastructure';

import { useAdminMembersSchedulesQuery } from '../useAdminMembersSchedulesQuery';

vi.mock('@/lib/infrastructure', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('useAdminMembersSchedulesQuery', () => {
  it('parses correct Sunday metadata', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: '1',
              metadata: {
                first_sunday: '9AM, 12NN',
                second_sunday: ' 3PM ',
                third_sunday: '9AM, invalid_time',
              },
              is_active: true,
            },
          ],
          error: null,
        }),
      }),
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const queryClient = new QueryClient();
    const { result } = renderHook(() => useAdminMembersSchedulesQuery(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data![0]).toEqual(
      expect.objectContaining({
        sundayKey: 'first_sunday',
        timeSlots: ['9AM', '12NN'],
      }),
    );
    expect(result.current.data![1]).toEqual(
      expect.objectContaining({
        sundayKey: 'second_sunday',
        timeSlots: ['3PM'],
      }),
    );
    expect(result.current.data![2]).toEqual(
      expect.objectContaining({
        sundayKey: 'third_sunday',
        timeSlots: ['9AM'],
      }),
    );
  });
});
