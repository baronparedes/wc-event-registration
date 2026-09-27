import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendAppNotification } from '@/lib/domain/notifications';

import { AdminNotificationsPage } from '../index';

vi.mock('@/lib/domain/notifications', () => ({
  sendAppNotification: vi.fn(),
}));

describe('AdminNotificationsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AdminNotificationsPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('renders the notification broadcast form', () => {
    renderPage();

    expect(screen.getByText('App Notifications')).toBeInTheDocument();
    expect(screen.getByText('Notification Broadcast')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Message/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Target Audience/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Broadcast/i })).toBeInTheDocument();
  });

  it('submits a broadcast to all users successfully', async () => {
    vi.mocked(sendAppNotification).mockResolvedValueOnce({
      success: true,
      count: 42,
      notificationId: 'notif-123',
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/^Title/i), {
      target: { value: 'Sunday Service Reminder' },
    });
    fireEvent.change(screen.getByLabelText(/^Message/i), {
      target: { value: 'Service starts at 9:00 AM' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Broadcast/i }));

    await waitFor(() => {
      expect(sendAppNotification).toHaveBeenCalledWith({
        title: 'Sunday Service Reminder',
        message: 'Service starts at 9:00 AM',
        targetType: 'all',
      });
    });
  });

  it('submits a broadcast to a specific role with destination url', async () => {
    vi.mocked(sendAppNotification).mockResolvedValueOnce({
      success: true,
      count: 5,
      notificationId: 'notif-456',
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/^Title/i), {
      target: { value: 'Admin Meeting' },
    });
    fireEvent.change(screen.getByLabelText(/^Message/i), {
      target: { value: 'Meeting starts at 2 PM' },
    });

    // Select role target
    fireEvent.click(screen.getByLabelText(/^Target Audience/i));
    fireEvent.click(screen.getByRole('option', { name: 'Specific Role' }));

    // Select specific role
    expect(screen.getByLabelText(/^Role/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/^Role/i));
    fireEvent.click(screen.getByRole('option', { name: 'Admin' }));

    // Add destination URL
    fireEvent.change(screen.getByLabelText(/^Destination URL/i), {
      target: { value: '/admin/events' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Broadcast/i }));

    await waitFor(() => {
      expect(sendAppNotification).toHaveBeenCalledWith({
        title: 'Admin Meeting',
        message: 'Meeting starts at 2 PM',
        targetType: 'role',
        targetRole: 'admin',
        url: '/admin/events',
      });
    });
  });

  it('submits a broadcast to a specific user ID', async () => {
    vi.mocked(sendAppNotification).mockResolvedValueOnce({
      success: true,
      count: 1,
      notificationId: 'notif-789',
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/^Title/i), {
      target: { value: 'Personal Notice' },
    });
    fireEvent.change(screen.getByLabelText(/^Message/i), {
      target: { value: 'Please update your schedule' },
    });

    // Select user target
    fireEvent.click(screen.getByLabelText(/^Target Audience/i));
    fireEvent.click(screen.getByRole('option', { name: 'Specific User ID' }));

    // Enter user ID
    const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    expect(screen.getByLabelText(/^User ID/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^User ID/i), {
      target: { value: userId },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Broadcast/i }));

    await waitFor(() => {
      expect(sendAppNotification).toHaveBeenCalledWith({
        title: 'Personal Notice',
        message: 'Please update your schedule',
        targetType: 'user',
        targetUserId: userId,
      });
    });
  });

  it('handles broadcast submission error gracefully', async () => {
    vi.mocked(sendAppNotification).mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    fireEvent.change(screen.getByLabelText(/^Title/i), {
      target: { value: 'Test Title' },
    });
    fireEvent.change(screen.getByLabelText(/^Message/i), {
      target: { value: 'Test Message' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Broadcast/i }));

    await waitFor(() => {
      expect(sendAppNotification).toHaveBeenCalled();
    });
  });
});
