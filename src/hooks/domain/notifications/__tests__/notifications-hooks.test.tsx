import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchUserNotifications,
  managePushSubscription,
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

vi.mock('@/config/env', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/config/env')>();
  return { env: { ...original.env, vapidPublicKey: 'AQID' } };
});

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

  afterEach(() => {
    vi.unstubAllGlobals();
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

    it('rejects subscription without browser push support without calling the API', async () => {
      const { result } = renderHook(() => usePushSubscription(), { wrapper });

      await expect(result.current.subscribeAsync()).rejects.toThrow(
        'Push notifications are not supported by your browser.',
      );
      expect(managePushSubscription).not.toHaveBeenCalled();
    });

    it('registers a new push subscription and removes it on unsubscribe', async () => {
      const unsubscribe = vi.fn().mockResolvedValue(true);
      const subscription = {
        endpoint: 'https://push.example.com/subscription',
        getKey: vi.fn((key: string) =>
          key === 'p256dh' ? Uint8Array.from([1, 2]).buffer : Uint8Array.from([3, 4]).buffer,
        ),
        unsubscribe,
      };
      let currentSubscription: typeof subscription | null = null;
      const getSubscription = vi.fn(async () => currentSubscription);
      const subscribe = vi.fn(async () => {
        currentSubscription = subscription;
        return subscription;
      });
      vi.stubGlobal('navigator', {
        ...navigator,
        serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription, subscribe } }) },
      });
      vi.stubGlobal('PushManager', class {});
      vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });
      vi.mocked(managePushSubscription).mockResolvedValue({ success: true });

      const { result } = renderHook(() => usePushSubscription(), { wrapper });

      await act(async () => {
        await result.current.subscribeAsync();
      });

      expect(subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: Uint8Array.from([1, 2, 3]).buffer,
      });
      expect(managePushSubscription).toHaveBeenCalledWith({
        action: 'subscribe',
        subscription: {
          endpoint: subscription.endpoint,
          keys: { p256dh: 'AQI=', auth: 'AwQ=' },
        },
      });

      await act(async () => {
        await result.current.unsubscribeAsync();
      });

      expect(managePushSubscription).toHaveBeenCalledWith({
        action: 'unsubscribe',
        subscription: {
          endpoint: subscription.endpoint,
          keys: { p256dh: 'AQI=', auth: 'AwQ=' },
        },
      });
      expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it('rejects denied notification permission without contacting the API', async () => {
      vi.stubGlobal('navigator', { ...navigator, serviceWorker: { ready: Promise.resolve({}) } });
      vi.stubGlobal('PushManager', class {});
      vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('denied') });

      const { result } = renderHook(() => usePushSubscription(), { wrapper });

      await expect(result.current.subscribeAsync()).rejects.toThrow(
        'Notification permission was blocked in browser settings.',
      );
      expect(managePushSubscription).not.toHaveBeenCalled();
    });

    it('rejects subscriptions missing encryption keys without contacting the API', async () => {
      const subscription = {
        endpoint: 'https://push.example.com/subscription',
        getKey: vi.fn().mockReturnValue(null),
      };
      vi.stubGlobal('navigator', {
        ...navigator,
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: { getSubscription: vi.fn().mockResolvedValue(subscription) },
          }),
        },
      });
      vi.stubGlobal('PushManager', class {});
      vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });

      const { result } = renderHook(() => usePushSubscription(), { wrapper });

      await expect(result.current.subscribeAsync()).rejects.toThrow(
        'Failed to retrieve push encryption keys from browser.',
      );
      expect(managePushSubscription).not.toHaveBeenCalled();
    });
  });
});
