import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthUsersQuery } from '@/hooks/domain/auth';
import { sendAppNotification } from '@/lib/domain/notifications';

import { AdminNotificationsPage } from '../index';

vi.mock('@/lib/domain/notifications', () => ({
  sendAppNotification: vi.fn(),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAuthUsersQuery: vi.fn(),
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

    vi.mocked(useAuthUsersQuery).mockReturnValue({
      data: [
        {
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: 'John Doe',
          email: 'john.doe@example.com',
          avatar_object_key: null,
          has_member_profile: true,
          created_at: '2026-01-01T00:00:00Z',
          last_sign_in_at: null,
        },
        {
          id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          avatar_object_key: null,
          has_member_profile: false,
          created_at: '2026-01-02T00:00:00Z',
          last_sign_in_at: null,
        },
      ],
      isLoading: false,
    } as never);
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

  it('submits a broadcast to all users successfully through confirmation modal', async () => {
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

    // Confirm dialog appears
    await waitFor(() => {
      expect(screen.getByText('Confirm Broadcast')).toBeInTheDocument();
      expect(screen.getByText('Mass Broadcast')).toBeInTheDocument();
    });

    // Click confirm in modal
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Send/i }));

    await waitFor(() => {
      expect(sendAppNotification).toHaveBeenCalledWith({
        title: 'Sunday Service Reminder',
        message: 'Service starts at 9:00 AM',
        targetType: 'all',
      });
    });
  });

  it('allows canceling confirmation modal and returning to edit', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/^Title/i), {
      target: { value: 'Sunday Service Reminder' },
    });
    fireEvent.change(screen.getByLabelText(/^Message/i), {
      target: { value: 'Service starts at 9:00 AM' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Broadcast/i }));

    await waitFor(() => {
      expect(screen.getByText('Confirm Broadcast')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Back to Edit/i }));

    expect(screen.queryByText('Confirm Broadcast')).not.toBeInTheDocument();
    expect(sendAppNotification).not.toHaveBeenCalled();
  });

  it('submits a broadcast to multiple roles with destination url', async () => {
    vi.mocked(sendAppNotification).mockResolvedValueOnce({
      success: true,
      count: 7,
      notificationId: 'notif-456',
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/^Title/i), {
      target: { value: 'Volunteers & Admins Briefing' },
    });
    fireEvent.change(screen.getByLabelText(/^Message/i), {
      target: { value: 'Please review the schedule' },
    });

    // Select role target
    fireEvent.click(screen.getByLabelText(/^Target Audience/i));
    fireEvent.click(screen.getByRole('option', { name: 'Specific Roles' }));

    // Open multi-role dropdown
    const roleTrigger = screen.getByRole('button', { name: /Target roles selection trigger/i });
    fireEvent.click(roleTrigger);

    // Select Prayer Coach and Admin
    const prayerCoachCheckbox = screen.getByLabelText('Prayer Coach');
    const adminCheckbox = screen.getByLabelText('Admin');

    fireEvent.click(prayerCoachCheckbox);
    fireEvent.click(adminCheckbox);

    // Add destination URL
    fireEvent.change(screen.getByLabelText(/^Destination URL/i), {
      target: { value: '/profile' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Broadcast/i }));

    // Confirm dialog
    await waitFor(() => {
      expect(screen.getByText('Confirm Broadcast')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Send/i }));

    await waitFor(() => {
      expect(sendAppNotification).toHaveBeenCalledWith({
        title: 'Volunteers & Admins Briefing',
        message: 'Please review the schedule',
        targetType: 'role',
        targetRole: 'Prayer Coach',
        targetRoles: ['Prayer Coach', 'admin'],
        url: '/profile',
      });
    });
  });

  it('allows removing a selected role pill in multi-select', async () => {
    renderPage();

    // Select role target
    fireEvent.click(screen.getByLabelText(/^Target Audience/i));
    fireEvent.click(screen.getByRole('option', { name: 'Specific Roles' }));

    // Open multi-role dropdown
    const roleTrigger = screen.getByRole('button', { name: /Target roles selection trigger/i });
    fireEvent.click(roleTrigger);

    const prayerCoachCheckbox = screen.getByLabelText('Prayer Coach');
    fireEvent.click(prayerCoachCheckbox);

    // Pill remove button appears
    const removePillBtn = screen.getByRole('button', { name: /Remove role Prayer Coach/i });
    expect(removePillBtn).toBeInTheDocument();

    // Click remove role
    fireEvent.click(removePillBtn);

    expect(
      screen.queryByRole('button', { name: /Remove role Prayer Coach/i }),
    ).not.toBeInTheDocument();
  });

  it('submits a broadcast to a specific user using mention-like user picker', async () => {
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
    fireEvent.click(screen.getByRole('option', { name: 'Specific User' }));

    // User picker combobox is shown
    const userSearchInput = screen.getByRole('combobox');
    expect(userSearchInput).toBeInTheDocument();

    // Focus / type search term
    fireEvent.focus(userSearchInput);
    fireEvent.change(userSearchInput, { target: { value: '@john' } });

    // Select John Doe from option list
    const userOption = screen.getByText('John Doe');
    fireEvent.click(userOption);

    // Selected user card is displayed
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove selected user' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Send Broadcast/i }));

    // Confirm dialog
    await waitFor(() => {
      expect(screen.getByText('Confirm Broadcast')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Send/i }));

    await waitFor(() => {
      expect(sendAppNotification).toHaveBeenCalledWith({
        title: 'Personal Notice',
        message: 'Please update your schedule',
        targetType: 'user',
        targetUserId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
    });
  });

  it('allows clearing and re-selecting user in user picker', async () => {
    renderPage();

    // Select user target
    fireEvent.click(screen.getByLabelText(/^Target Audience/i));
    fireEvent.click(screen.getByRole('option', { name: 'Specific User' }));

    const userSearchInput = screen.getByRole('combobox');
    fireEvent.focus(userSearchInput);
    fireEvent.click(screen.getByText('Jane Smith'));

    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();

    // Click remove
    const removeBtn = screen.getByRole('button', { name: 'Remove selected user' });
    fireEvent.click(removeBtn);

    // Search input reappears
    expect(screen.getByRole('combobox')).toBeInTheDocument();
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

    // Confirm dialog
    await waitFor(() => {
      expect(screen.getByText('Confirm Broadcast')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Send/i }));

    await waitFor(() => {
      expect(sendAppNotification).toHaveBeenCalled();
    });
  });

  it('displays validation error when submitting with Specific Roles but no role selected', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/^Title/i), {
      target: { value: 'Role Broadcast' },
    });
    fireEvent.change(screen.getByLabelText(/^Message/i), {
      target: { value: 'Role Message' },
    });

    fireEvent.click(screen.getByLabelText(/^Target Audience/i));
    fireEvent.click(screen.getByRole('option', { name: 'Specific Roles' }));

    fireEvent.click(screen.getByRole('button', { name: /Send Broadcast/i }));

    await waitFor(() => {
      expect(screen.getByText('Please select at least one role')).toBeInTheDocument();
    });
    expect(screen.queryByText('Confirm Broadcast')).not.toBeInTheDocument();
  });

  it('displays validation error when submitting with Specific User but no user selected', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/^Title/i), {
      target: { value: 'User Broadcast' },
    });
    fireEvent.change(screen.getByLabelText(/^Message/i), {
      target: { value: 'User Message' },
    });

    fireEvent.click(screen.getByLabelText(/^Target Audience/i));
    fireEvent.click(screen.getByRole('option', { name: 'Specific User' }));

    fireEvent.click(screen.getByRole('button', { name: /Send Broadcast/i }));

    await waitFor(() => {
      expect(screen.getByText('Please select a target user')).toBeInTheDocument();
    });
    expect(screen.queryByText('Confirm Broadcast')).not.toBeInTheDocument();
  });

  it('resets target roles and user fields when switching audience back to All Users', async () => {
    renderPage();

    // Select role and check a role
    fireEvent.click(screen.getByLabelText(/^Target Audience/i));
    fireEvent.click(screen.getByRole('option', { name: 'Specific Roles' }));

    fireEvent.click(screen.getByRole('button', { name: /Target roles selection trigger/i }));
    fireEvent.click(screen.getByLabelText('Admin'));

    expect(screen.getByRole('button', { name: 'Remove role Admin' })).toBeInTheDocument();

    // Switch to All Users
    fireEvent.click(screen.getByLabelText(/^Target Audience/i));
    fireEvent.click(screen.getByRole('option', { name: 'All Users' }));

    // Switch back to Specific Roles and verify reset
    fireEvent.click(screen.getByLabelText(/^Target Audience/i));
    fireEvent.click(screen.getByRole('option', { name: 'Specific Roles' }));

    expect(screen.getByText('Select target roles...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove role Admin' })).not.toBeInTheDocument();
  });
});
