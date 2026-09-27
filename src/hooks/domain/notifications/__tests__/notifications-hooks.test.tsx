import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/lib/domain/notifications';
import { supabase } from '@/lib/infrastructure';

import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  usePushSubscription,
} from '../index';

vi.mock('@/lib/domain/notifications', () => ({
  fetchUserNotifications: vi.fn(),
  managePushSubscription: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
}));

vi.mock('@/lib/infrastructure', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

describe('Notifications Domain Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'u-1' } } },
    } as never);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('useNotificationsQuery fetches notifications and sets up realtime channel', async () => {
    const mockData = [
      {
        id: 'rec-1',
        notification_id: 'n-1',
        is_read: false,
        read_at: null,
        notification: {
          id: 'n-1',
          title: 'Hello',
          message: 'World',
          created_at: '2026-09-27T00:00:00Z',
        },
      },
    ];
    vi.mocked(fetchUserNotifications).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useNotificationsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(supabase.channel).toHaveBeenCalledWith('app_notification_recipients_u-1');
  });

  it('useMarkNotificationReadMutation calls markNotificationAsRead and invalidates cache', async () => {
    vi.mocked(markNotificationAsRead).mockResolvedValueOnce({
      id: 'rec-1',
      notification_id: 'n-1',
      is_read: true,
      read_at: '2026-09-27T10:00:00Z',
      notification: {
        id: 'n-1',
        title: 'Hello',
        message: 'World',
        created_at: '2026-09-27T00:00:00Z',
      },
    });

    const { result } = renderHook(() => useMarkNotificationReadMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('rec-1');
    });

    expect(markNotificationAsRead).toHaveBeenCalledWith('rec-1');
  });

  it('useMarkAllNotificationsReadMutation calls markAllNotificationsAsRead and invalidates cache', async () => {
    vi.mocked(markAllNotificationsAsRead).mockResolvedValueOnce();

    const { result } = renderHook(() => useMarkAllNotificationsReadMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(markAllNotificationsAsRead).toHaveBeenCalled();
  });

  describe('usePushSubscription', () => {
    it('returns supported=false when PushManager or serviceWorker are absent', () => {
      const { result } = renderHook(() => usePushSubscription(), { wrapper });
      expect(result.current.isSupported).toBe(false);
      expect(result.current.isSubscribed).toBe(false);
    });
  });
});
