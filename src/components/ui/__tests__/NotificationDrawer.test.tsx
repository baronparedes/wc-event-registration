import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  usePushSubscription,
} from '@/hooks/domain/notifications';

import { NotificationDrawer } from '../NotificationDrawer';

vi.mock('@/hooks/domain/notifications', () => ({
  useNotificationsQuery: vi.fn(),
  useMarkNotificationReadMutation: vi.fn(),
  useMarkAllNotificationsReadMutation: vi.fn(),
  usePushSubscription: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotificationDrawer', () => {
  const mockMarkRead = { mutate: vi.fn(), isPending: false };
  const mockMarkAllRead = { mutate: vi.fn(), isPending: false };
  const mockPush = {
    isSupported: true,
    isSubscribed: false,
    isLoading: false,
    subscribeAsync: vi.fn().mockResolvedValue(true),
    unsubscribeAsync: vi.fn().mockResolvedValue(true),
  };
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMarkNotificationReadMutation).mockReturnValue(mockMarkRead as never);
    vi.mocked(useMarkAllNotificationsReadMutation).mockReturnValue(mockMarkAllRead as never);
    vi.mocked(usePushSubscription).mockReturnValue(mockPush as never);

    // Default to no notifications
    vi.mocked(useNotificationsQuery).mockReturnValue({ data: [] } as never);
  });

  const renderComponent = (isOpen = true) => {
    return render(
      <MemoryRouter>
        <NotificationDrawer isOpen={isOpen} onClose={mockOnClose} />
      </MemoryRouter>,
    );
  };

  it('renders nothing when not open', () => {
    // Note: It renders the aside and translate-x-full, so it's technically in DOM but hidden
    // The overlay is what's conditionally rendered in the portal for `isOpen`.
    renderComponent(false);
    expect(screen.queryByLabelText('Close notifications drawer overlay')).not.toBeInTheDocument();
  });

  it('renders the drawer when open', () => {
    renderComponent(true);
    expect(screen.getByLabelText('Notifications drawer')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('displays empty state when there are no notifications', () => {
    renderComponent(true);
    expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
  });

  it('renders notifications and correct unread counts', () => {
    vi.mocked(useNotificationsQuery).mockReturnValue({
      data: [
        {
          id: 'rec-1',
          notification_id: 'notif-1',
          is_read: false,
          read_at: null,
          notification: {
            id: 'notif-1',
            title: 'Sunday Service',
            message: 'Service starts soon',
            created_at: new Date().toISOString(),
          },
        },
        {
          id: 'rec-2',
          notification_id: 'notif-2',
          is_read: true,
          read_at: new Date().toISOString(),
          notification: {
            id: 'notif-2',
            title: 'Welcome!',
            message: 'Thanks for joining',
            created_at: new Date().toISOString(),
          },
        },
      ],
    } as never);

    renderComponent(true);
    expect(screen.getByText('Sunday Service')).toBeInTheDocument();
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
    expect(screen.getByText('1 New')).toBeInTheDocument(); // Badge
  });

  it('calls markAllRead mutation when Mark all as read is clicked', () => {
    vi.mocked(useNotificationsQuery).mockReturnValue({
      data: [
        {
          id: 'rec-1',
          notification_id: 'notif-1',
          is_read: false,
          read_at: null,
          notification: {
            id: 'notif-1',
            title: 'Unread notif',
            message: 'msg',
            created_at: new Date().toISOString(),
          },
        },
      ],
    } as never);

    renderComponent(true);
    const markAllReadBtn = screen.getByText('Mark all as read');
    fireEvent.click(markAllReadBtn);
    expect(mockMarkAllRead.mutate).toHaveBeenCalledTimes(1);
  });

  it('filters notifications when switching tabs', () => {
    vi.mocked(useNotificationsQuery).mockReturnValue({
      data: [
        {
          id: 'rec-1',
          notification_id: 'notif-1',
          is_read: false,
          read_at: null,
          notification: {
            id: 'notif-1',
            title: 'Unread notif',
            message: 'msg',
            created_at: new Date().toISOString(),
          },
        },
        {
          id: 'rec-2',
          notification_id: 'notif-2',
          is_read: true,
          read_at: new Date().toISOString(),
          notification: {
            id: 'notif-2',
            title: 'Read notif',
            message: 'msg',
            created_at: new Date().toISOString(),
          },
        },
      ],
    } as never);

    renderComponent(true);

    // Initially "All" is active, so both should be visible
    expect(screen.getByText('Unread notif')).toBeInTheDocument();
    expect(screen.getByText('Read notif')).toBeInTheDocument();

    // Click "Unread" tab
    const unreadTab = screen.getByRole('tab', { name: /Unread/i });
    fireEvent.click(unreadTab);

    expect(screen.getByText('Unread notif')).toBeInTheDocument();
    expect(screen.queryByText('Read notif')).not.toBeInTheDocument();
  });

  it('marks single notification as read and navigates when clicked', () => {
    vi.mocked(useNotificationsQuery).mockReturnValue({
      data: [
        {
          id: 'rec-1',
          notification_id: 'notif-1',
          is_read: false,
          read_at: null,
          notification: {
            id: 'notif-1',
            title: 'Unread notif',
            message: 'msg',
            target_url: '/some-page',
            created_at: new Date().toISOString(),
          },
        },
      ],
    } as never);

    renderComponent(true);

    const notifItem = screen.getByText('Unread notif').closest('button')!;
    fireEvent.click(notifItem);

    expect(mockMarkRead.mutate).toHaveBeenCalledWith('rec-1');
    expect(mockNavigate).toHaveBeenCalledWith('/some-page');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes when escape key is pressed', () => {
    renderComponent(true);
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles push subscription enabling', async () => {
    renderComponent(true);

    const enableBtn = screen.getByRole('button', { name: 'Enable' });
    fireEvent.click(enableBtn);

    expect(mockPush.subscribeAsync).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Successfully enabled push notifications on this device!',
      );
    });
  });

  it('handles push subscription error', async () => {
    mockPush.subscribeAsync.mockRejectedValueOnce(new Error('Push error'));
    renderComponent(true);

    const enableBtn = screen.getByRole('button', { name: 'Enable' });
    fireEvent.click(enableBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Push error');
    });
  });

  it('handles push subscription disabling', async () => {
    vi.mocked(usePushSubscription).mockReturnValue({
      ...mockPush,
      isSubscribed: true,
    } as never);

    renderComponent(true);

    const disableBtn = screen.getByRole('button', { name: 'Turn off' });
    fireEvent.click(disableBtn);

    expect(mockPush.unsubscribeAsync).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Disabled push notifications on this device.');
    });
  });
});
