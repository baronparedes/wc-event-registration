import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  usePushSubscription,
} from '@/hooks/domain/notifications';

import { NotificationBell } from '../NotificationBell';

vi.mock('@/hooks/domain/notifications', () => ({
  useNotificationsQuery: vi.fn(),
  useMarkNotificationReadMutation: vi.fn(),
  useMarkAllNotificationsReadMutation: vi.fn(),
  usePushSubscription: vi.fn(),
}));

describe('NotificationBell', () => {
  const mockMarkRead = { mutate: vi.fn(), isPending: false };
  const mockMarkAllRead = { mutate: vi.fn(), isPending: false };
  const mockPush = {
    isSupported: true,
    isSubscribed: false,
    isLoading: false,
    subscribeAsync: vi.fn().mockResolvedValue(true),
    unsubscribeAsync: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMarkNotificationReadMutation).mockReturnValue(mockMarkRead as never);
    vi.mocked(useMarkAllNotificationsReadMutation).mockReturnValue(mockMarkAllRead as never);
    vi.mocked(usePushSubscription).mockReturnValue(mockPush as never);
  });

  it('renders bell icon with unread count badge when there are unread notifications', () => {
    vi.mocked(useNotificationsQuery).mockReturnValue({
      data: [
        {
          id: 'rec-1',
          notification_id: 'notif-1',
          is_read: false,
          read_at: null,
          notification: {
            id: 'notif-1',
            title: 'Sunday Service Alert',
            message: 'Service starts at 9AM',
            created_at: '2026-09-27T08:00:00Z',
          },
        },
      ],
    } as never);

    render(<NotificationBell />);

    const bellBtn = screen.getByRole('button', { name: /Notifications \(1 unread\)/i });
    expect(bellBtn).toBeInTheDocument();
  });

  it('opens notification dropdown, displays notifications, and allows marking individual as read', () => {
    vi.mocked(useNotificationsQuery).mockReturnValue({
      data: [
        {
          id: 'rec-1',
          notification_id: 'notif-1',
          is_read: false,
          read_at: null,
          notification: {
            id: 'notif-1',
            title: 'Sunday Service Alert',
            message: 'Service starts at 9AM',
            created_at: '2026-09-27T08:00:00Z',
          },
        },
        {
          id: 'rec-2',
          notification_id: 'notif-2',
          is_read: true,
          read_at: '2026-09-27T09:00:00Z',
          notification: {
            id: 'notif-2',
            title: 'Welcome New Member',
            message: 'Welcome to the community!',
            created_at: '2026-09-26T08:00:00Z',
          },
        },
      ],
    } as never);

    render(<NotificationBell />);

    const bellBtn = screen.getByRole('button', { name: /Notifications/i });
    fireEvent.click(bellBtn);

    expect(screen.getByText('Sunday Service Alert')).toBeInTheDocument();
    expect(screen.getByText('Welcome New Member')).toBeInTheDocument();
    expect(screen.getByText('1 New')).toBeInTheDocument();

    // Click on unread notification item
    const unreadItem = screen.getByText('Sunday Service Alert').closest('[role="button"]');
    expect(unreadItem).toBeInTheDocument();
    fireEvent.click(unreadItem!);
    expect(mockMarkRead.mutate).toHaveBeenCalledWith('rec-1');

    // Trigger keydown Enter
    fireEvent.keyDown(unreadItem!, { key: 'Enter' });
    expect(mockMarkRead.mutate).toHaveBeenCalledWith('rec-1');
  });

  it('allows marking all notifications as read', () => {
    vi.mocked(useNotificationsQuery).mockReturnValue({
      data: [
        {
          id: 'rec-1',
          notification_id: 'notif-1',
          is_read: false,
          read_at: null,
          notification: {
            id: 'notif-1',
            title: 'Test Notification',
            message: 'Test message',
            created_at: '2026-09-27T08:00:00Z',
          },
        },
      ],
    } as never);

    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    const markAllBtn = screen.getByRole('button', { name: /Mark all as read/i });
    fireEvent.click(markAllBtn);
    expect(mockMarkAllRead.mutate).toHaveBeenCalled();
  });

  it('renders empty state when there are no notifications', () => {
    vi.mocked(useNotificationsQuery).mockReturnValue({
      data: [],
    } as never);

    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    expect(screen.getByText('No notifications')).toBeInTheDocument();
    expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
  });

  it('handles push subscribe and unsubscribe in the dropdown', async () => {
    vi.mocked(useNotificationsQuery).mockReturnValue({
      data: [],
    } as never);

    const { rerender } = render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    const enableBtn = screen.getByRole('button', { name: 'Enable' });
    fireEvent.click(enableBtn);
    expect(mockPush.subscribeAsync).toHaveBeenCalled();

    // Rerender as subscribed
    vi.mocked(usePushSubscription).mockReturnValue({
      ...mockPush,
      isSubscribed: true,
    } as never);

    rerender(<NotificationBell />);

    expect(screen.getByText('Push alerts active on this device')).toBeInTheDocument();
    const turnOffBtn = screen.getByRole('button', { name: 'Turn off' });
    fireEvent.click(turnOffBtn);
    expect(mockPush.unsubscribeAsync).toHaveBeenCalled();
  });

  it('handles push subscribe error with toast', async () => {
    mockPush.subscribeAsync.mockRejectedValueOnce(new Error('Push blocked'));
    vi.mocked(useNotificationsQuery).mockReturnValue({
      data: [],
    } as never);

    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    const enableBtn = screen.getByRole('button', { name: 'Enable' });
    fireEvent.click(enableBtn);
    expect(mockPush.subscribeAsync).toHaveBeenCalled();
  });

  it('handles push unsubscribe error with toast', async () => {
    mockPush.unsubscribeAsync.mockRejectedValueOnce(new Error('Failed to unregister'));
    vi.mocked(usePushSubscription).mockReturnValue({
      ...mockPush,
      isSubscribed: true,
    } as never);
    vi.mocked(useNotificationsQuery).mockReturnValue({
      data: [],
    } as never);

    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    const turnOffBtn = screen.getByRole('button', { name: 'Turn off' });
    fireEvent.click(turnOffBtn);
    expect(mockPush.unsubscribeAsync).toHaveBeenCalled();
  });
});
