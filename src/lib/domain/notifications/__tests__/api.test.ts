import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/lib/infrastructure';

import {
  fetchUserNotifications,
  managePushSubscription,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  sendAppNotification,
} from '../api';

vi.mock('@/lib/infrastructure', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Notifications Domain API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendAppNotification', () => {
    it('successfully invokes send-app-notification edge function', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { success: true, count: 10, notificationId: 'notif-123' },
        error: null,
      });

      const payload = {
        title: 'Title',
        message: 'Message',
        targetType: 'all' as const,
      };

      const result = await sendAppNotification(payload);
      expect(result).toEqual({ success: true, count: 10, notificationId: 'notif-123' });
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-app-notification', {
        body: payload,
      });
    });

    it('throws error when edge function invocation returns error', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: new Error('Function error'),
      });

      await expect(
        sendAppNotification({
          title: 'Title',
          message: 'Message',
          targetType: 'all',
        }),
      ).rejects.toThrow('Function error');
    });

    it('throws error when data.success is false', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { success: false, count: 0, notificationId: '' },
        error: null,
      });

      await expect(
        sendAppNotification({
          title: 'Title',
          message: 'Message',
          targetType: 'all',
        }),
      ).rejects.toThrow('Failed to send broadcast notification');
    });
  });

  describe('managePushSubscription', () => {
    it('successfully invokes manage-push-subscription', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      const result = await managePushSubscription({ action: 'subscribe' });
      expect(result).toEqual({ success: true });
    });

    it('throws error when manage-push-subscription fails', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: new Error('Network failure'),
      });

      await expect(managePushSubscription({ action: 'subscribe' })).rejects.toThrow(
        'Network failure',
      );
    });

    it('throws error when result is not success', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { success: false },
        error: null,
      });

      await expect(managePushSubscription({ action: 'subscribe' })).rejects.toThrow(
        'Failed to manage push subscription',
      );
    });
  });

  describe('fetchUserNotifications', () => {
    it('returns empty array when there is no user session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
      } as never);

      const result = await fetchUserNotifications();
      expect(result).toEqual([]);
    });

    it('fetches and returns notifications for logged in user', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            user: { id: 'user-1' },
          },
        },
      } as never);

      const mockNotifications = [
        {
          id: 'rec-1',
          notification_id: 'notif-1',
          is_read: false,
          read_at: null,
          notification: {
            id: 'notif-1',
            title: 'Test',
            message: 'Msg',
            created_at: '2026-09-27T00:00:00Z',
          },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce({ data: mockNotifications, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      const result = await fetchUserNotifications();
      expect(result).toEqual(mockNotifications);
    });

    it('throws when select query errors', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            user: { id: 'user-1' },
          },
        },
      } as never);

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce({ data: null, error: new Error('DB Error') }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      await expect(fetchUserNotifications()).rejects.toThrow('DB Error');
    });
  });

  describe('markNotificationAsRead', () => {
    it('updates is_read and read_at timestamp', async () => {
      const mockResult = { id: 'rec-1', is_read: true, read_at: '2026-09-27T10:00:00Z' };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({ data: mockResult, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      const result = await markNotificationAsRead('rec-1');
      expect(result).toEqual(mockResult);
    });

    it('throws when markNotificationAsRead encounters an error', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({ data: null, error: new Error('Update failed') }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      await expect(markNotificationAsRead('rec-1')).rejects.toThrow('Update failed');
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('returns early if no session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
      } as never);

      await markAllNotificationsAsRead();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('marks all unread as read for current user', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            user: { id: 'user-1' },
          },
        },
      } as never);

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // Chain 2 eq calls: user_id and is_read
      mockQuery.eq.mockReturnValueOnce(mockQuery).mockResolvedValueOnce({ error: null });
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      await markAllNotificationsAsRead();
      expect(supabase.from).toHaveBeenCalledWith('app_notification_recipients');
    });

    it('throws when bulk update fails', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            user: { id: 'user-1' },
          },
        },
      } as never);

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockQuery.eq
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce({ error: new Error('Bulk update failed') });
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      await expect(markAllNotificationsAsRead()).rejects.toThrow('Bulk update failed');
    });
  });
});
