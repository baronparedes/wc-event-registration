import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/lib/infrastructure';

import {
  dispatchSundayReminders,
  fetchUserNotifications,
  getBroadcastAudienceStats,
  getSundaySchedulePreview,
  managePushSubscription,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  sendAppNotification,
} from '../api';

const {
  mockSendCaller,
  mockPushCaller,
  mockCronEmailCaller,
  mockCronPushCaller,
  mockCreateEdgeFunctionCaller,
} = vi.hoisted(() => {
  const sendCaller = vi.fn();
  const pushCaller = vi.fn();
  const cronEmailCaller = vi.fn();
  const cronPushCaller = vi.fn();
  const createCaller = vi.fn((fnName: string) => {
    if (fnName === 'send-app-notification') return sendCaller;
    if (fnName === 'manage-push-subscription') return pushCaller;
    if (fnName === 'cron-process-email-queue') return cronEmailCaller;
    if (fnName === 'cron-process-push-reminders') return cronPushCaller;
    return vi.fn();
  });
  return {
    mockSendCaller: sendCaller,
    mockPushCaller: pushCaller,
    mockCronEmailCaller: cronEmailCaller,
    mockCronPushCaller: cronPushCaller,
    mockCreateEdgeFunctionCaller: createCaller,
  };
});

vi.mock('@/lib/infrastructure', () => ({
  createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Notifications Domain API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendAppNotification', () => {
    it('successfully invokes send-app-notification edge function', async () => {
      mockSendCaller.mockResolvedValueOnce({
        success: true,
        count: 10,
        notificationId: 'notif-123',
      });

      const payload = {
        title: 'Title',
        message: 'Message',
        targetType: 'all' as const,
      };

      const result = await sendAppNotification(payload);
      expect(result).toEqual({ success: true, count: 10, notificationId: 'notif-123' });
      expect(mockSendCaller).toHaveBeenCalledWith(payload);
    });

    it('throws error when edge function invocation returns error', async () => {
      mockSendCaller.mockRejectedValueOnce(new Error('Function error'));

      await expect(
        sendAppNotification({
          title: 'Title',
          message: 'Message',
          targetType: 'all',
        }),
      ).rejects.toThrow('Function error');
    });

    it('throws error when data.success is false', async () => {
      mockSendCaller.mockResolvedValueOnce({
        success: false,
        count: 0,
        notificationId: '',
      });

      await expect(
        sendAppNotification({
          title: 'Title',
          message: 'Message',
          targetType: 'all',
        }),
      ).rejects.toThrow('Failed to send broadcast notification');
    });

    it('triggers email worker when channels include email', async () => {
      mockSendCaller.mockResolvedValueOnce({
        success: true,
        count: 5,
        emailCount: 5,
      });
      mockCronEmailCaller.mockResolvedValueOnce({ success: true, processed: 5 });

      await sendAppNotification({
        title: 'Title',
        message: 'Message',
        channels: ['email'],
        targetType: 'all',
      });

      expect(mockCronEmailCaller).toHaveBeenCalledWith({});
    });

    it('catches and logs warning if background email worker trigger fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockSendCaller.mockResolvedValueOnce({
        success: true,
        count: 5,
        emailCount: 5,
      });
      mockCronEmailCaller.mockRejectedValueOnce(new Error('Trigger fail'));

      await sendAppNotification({
        title: 'Title',
        message: 'Message',
        channels: ['email'],
        targetType: 'all',
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(warnSpy).toHaveBeenCalledWith(
        '[sendAppNotification] Email worker trigger warning:',
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });
  });

  describe('managePushSubscription', () => {
    it('successfully invokes manage-push-subscription', async () => {
      mockPushCaller.mockResolvedValueOnce({
        success: true,
      });

      const result = await managePushSubscription({ action: 'subscribe' });
      expect(result).toEqual({ success: true });
      expect(mockPushCaller).toHaveBeenCalledWith({ action: 'subscribe' });
    });

    it('throws error when manage-push-subscription fails', async () => {
      mockPushCaller.mockRejectedValueOnce(new Error('Network failure'));

      await expect(managePushSubscription({ action: 'subscribe' })).rejects.toThrow(
        'Network failure',
      );
    });

    it('throws error when result is not success', async () => {
      mockPushCaller.mockResolvedValueOnce({
        success: false,
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

  describe('getBroadcastAudienceStats', () => {
    it('fetches audience stats with mapped parameters', async () => {
      const mockStats = {
        total_recipients: 100,
        email_recipients_count: 80,
        push_recipients_count: 60,
        registered_members_count: 70,
        public_registrants_count: 30,
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockStats,
        error: null,
      } as never);

      const result = await getBroadcastAudienceStats({
        targetType: 'role',
        targetRoles: ['admin', 'slod'],
        targetUserId: 'user-123',
        targetEventId: 'event-456',
      });

      expect(result).toEqual(mockStats);
      expect(supabase.rpc).toHaveBeenCalledWith('get_broadcast_audience_stats', {
        p_target_type: 'role',
        p_target_roles: ['admin', 'slod'],
        p_user_id: 'user-123',
        p_event_id: 'event-456',
      });
    });

    it('falls back to default stats when data is null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: null,
      } as never);

      const result = await getBroadcastAudienceStats({
        targetType: 'all',
        targetRoles: [],
        targetUserId: '',
        targetEventId: '',
      });

      expect(result).toEqual({
        total_recipients: 0,
        email_recipients_count: 0,
        push_recipients_count: 0,
        registered_members_count: 0,
        public_registrants_count: 0,
      });
    });

    it('throws error when rpc fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('RPC failure'),
      } as never);

      await expect(
        getBroadcastAudienceStats({
          targetType: 'all',
        }),
      ).rejects.toThrow('Failed to fetch audience statistics: RPC failure');
    });
  });

  describe('getSundaySchedulePreview', () => {
    it('fetches Sunday schedule preview and triggers queued workers', async () => {
      const mockPreview = {
        sunday_date: '2026-10-18',
        email_delivery: { status: 'queued' },
        push_delivery: { status: 'queued' },
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockPreview,
        error: null,
      } as never);

      mockCronEmailCaller.mockResolvedValueOnce({ success: true, processed: 1 });
      mockCronPushCaller.mockResolvedValueOnce({ success: true, processed: 1 });

      const result = await getSundaySchedulePreview('2026-10-18');
      expect(result).toEqual(mockPreview);
      expect(supabase.rpc).toHaveBeenCalledWith('get_sunday_schedule_reminders_preview', {
        p_sunday_date: '2026-10-18',
      });
      expect(mockCronEmailCaller).toHaveBeenCalledWith({});
      expect(mockCronPushCaller).toHaveBeenCalledWith({});
    });

    it('handles preview without queued deliveries and without target date', async () => {
      const mockPreview = {
        sunday_date: '2026-10-18',
        email_delivery: { status: 'sent' },
        push_delivery: { status: 'idle' },
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockPreview,
        error: null,
      } as never);

      const result = await getSundaySchedulePreview();
      expect(result).toEqual(mockPreview);
      expect(supabase.rpc).toHaveBeenCalledWith('get_sunday_schedule_reminders_preview', {
        p_sunday_date: undefined,
      });
      expect(mockCronEmailCaller).not.toHaveBeenCalled();
      expect(mockCronPushCaller).not.toHaveBeenCalled();
    });

    it('throws error when preview fetch fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('Preview error'),
      } as never);

      await expect(getSundaySchedulePreview()).rejects.toThrow(
        'Failed to fetch Sunday schedule preview: Preview error',
      );
    });
  });

  describe('dispatchSundayReminders', () => {
    it('dispatches Sunday reminders and triggers specified background workers', async () => {
      const mockResponse = {
        success: true,
        queued_count: 42,
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as never);

      mockCronEmailCaller.mockResolvedValueOnce({ success: true, processed: 1 });
      mockCronPushCaller.mockResolvedValueOnce({ success: true, processed: 1 });

      const result = await dispatchSundayReminders({
        targetSundayDate: '2026-10-18',
        channels: ['email', 'push'],
        force: true,
      });

      expect(result).toEqual(mockResponse);
      expect(supabase.rpc).toHaveBeenCalledWith('dispatch_sunday_schedule_reminders', {
        p_target_date: '2026-10-18',
        p_channels: ['email', 'push'],
        p_force: true,
      });
      expect(mockCronEmailCaller).toHaveBeenCalledWith({});
      expect(mockCronPushCaller).toHaveBeenCalledWith({});
    });

    it('dispatches with default force and undefined date', async () => {
      const mockResponse = { success: true };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as never);

      const result = await dispatchSundayReminders({
        channels: [],
      });

      expect(result).toEqual(mockResponse);
      expect(supabase.rpc).toHaveBeenCalledWith('dispatch_sunday_schedule_reminders', {
        p_target_date: undefined,
        p_channels: [],
        p_force: false,
      });
    });

    it('throws when dispatch rpc fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('Dispatch failed'),
      } as never);

      await expect(
        dispatchSundayReminders({
          channels: ['email'],
        }),
      ).rejects.toThrow('Failed to dispatch Sunday schedule reminders: Dispatch failed');
    });
  });
});
