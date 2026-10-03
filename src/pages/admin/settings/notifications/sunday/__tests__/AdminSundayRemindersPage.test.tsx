import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminAuthQuery } from '@/hooks/domain/auth';
import * as domainNotifications from '@/lib/domain/notifications';
import type { SundaySchedulePreview } from '@/lib/domain/notifications/types';

import { AdminSundayRemindersPage } from '../index';

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: vi.fn(),
}));

vi.mock('@/lib/domain/notifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/domain/notifications')>();
  return {
    ...actual,
    getSundaySchedulePreview: vi.fn(),
    dispatchSundayReminders: vi.fn(),
  };
});

describe('AdminSundayRemindersPage', () => {
  let queryClient: QueryClient;

  const mockPreviewData: SundaySchedulePreview = {
    sunday_date: '2026-10-04',
    ordinal: 1,
    sunday_key: 'first_sunday',
    already_sent_push: false,
    push_sent_at: null,
    already_sent_email: false,
    email_sent_at: null,
    total_volunteers: 2,
    push_eligible_count: 1,
    email_eligible_count: 2,
    volunteers: [
      {
        user_id: 'user-1',
        member_id: 'MEM-001',
        full_name: 'Test Alice',
        email: 'test.alice@example.com',
        formatted_slots: '9:00 AM',
        has_push: true,
        has_email: true,
      },
      {
        user_id: 'user-2',
        member_id: 'MEM-002',
        full_name: 'Test Bob',
        email: 'test.bob@example.com',
        formatted_slots: '12:00 NN',
        has_push: false,
        has_email: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(useAdminAuthQuery).mockReturnValue({
      data: {
        adminRole: 'admin',
        isAuthenticated: true,
        session: null,
      },
      isLoading: false,
      error: null,
    } as never);

    vi.mocked(domainNotifications.getSundaySchedulePreview).mockResolvedValue(mockPreviewData);
    vi.mocked(domainNotifications.dispatchSundayReminders).mockResolvedValue({
      success: true,
      sunday_date: '2026-10-04',
      push_enqueued: 1,
      email_enqueued: 2,
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AdminSundayRemindersPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('renders page header, status cards, and volunteer table', async () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /Sunday Service Reminders/i })).toBeInTheDocument();
    expect(screen.getByText(/Schedule Dispatch Controls/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Test Alice')).toBeInTheDocument();
      expect(screen.getByText('Test Bob')).toBeInTheDocument();
    });

    expect(screen.getByText('9:00 AM')).toBeInTheDocument();
    expect(screen.getByText('12:00 NN')).toBeInTheDocument();
    expect(screen.getByText('MEM-001')).toBeInTheDocument();
  });

  it('opens confirmation modal and dispatches reminders when confirmed', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Alice')).toBeInTheDocument();
    });

    const dispatchButton = screen.getByRole('button', { name: /Dispatch Reminders/i });
    expect(dispatchButton).not.toBeDisabled();

    fireEvent.click(dispatchButton);

    expect(screen.getByText(/Confirm Sunday Schedule Dispatch/i)).toBeInTheDocument();

    const confirmModalButton = screen.getAllByRole('button', { name: /Dispatch Reminders/i })[1];
    fireEvent.click(confirmModalButton);

    await waitFor(() => {
      expect(domainNotifications.dispatchSundayReminders).toHaveBeenCalledWith({
        targetSundayDate: '2026-10-04',
        channels: ['push', 'email'],
        force: false,
      });
    });
  });

  it('displays warning and requires force confirmation checkbox when already sent', async () => {
    vi.mocked(domainNotifications.getSundaySchedulePreview).mockResolvedValueOnce({
      ...mockPreviewData,
      already_sent_push: true,
      push_sent_at: '2026-10-02T22:00:00Z',
      already_sent_email: true,
      email_sent_at: '2026-10-02T22:00:00Z',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Alice')).toBeInTheDocument();
    });

    const dispatchButton = screen.getByRole('button', { name: /Dispatch Reminders/i });
    fireEvent.click(dispatchButton);

    expect(screen.getByText(/Duplicate Dispatch Warning/i)).toBeInTheDocument();

    const forceButton = screen.getByRole('button', { name: /Force Re-dispatch/i });
    expect(forceButton).toBeDisabled();

    const checkbox = screen.getByLabelText(/Yes, I want to force re-dispatch this batch/i);
    fireEvent.click(checkbox);

    expect(forceButton).not.toBeDisabled();
    fireEvent.click(forceButton);

    await waitFor(() => {
      expect(domainNotifications.dispatchSundayReminders).toHaveBeenCalledWith({
        targetSundayDate: '2026-10-04',
        channels: ['push', 'email'],
        force: true,
      });
    });
  });

  it('displays delivery breakdown counts when delivery stats exist', async () => {
    vi.mocked(domainNotifications.getSundaySchedulePreview).mockResolvedValueOnce({
      ...mockPreviewData,
      already_sent_push: true,
      push_sent_at: '2026-10-02T22:00:00Z',
      push_delivery: {
        already_sent: true,
        sent_at: '2026-10-02T22:00:00Z',
        total_queued: 10,
        succeeded_count: 9,
        failed_count: 1,
        status: 'partial_failure',
      },
      already_sent_email: true,
      email_sent_at: '2026-10-02T22:00:00Z',
      email_delivery: {
        already_sent: true,
        sent_at: '2026-10-02T22:00:00Z',
        total_queued: 25,
        succeeded_count: 25,
        failed_count: 0,
        status: 'completed',
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Alice')).toBeInTheDocument();
    });

    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getAllByText('25').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Partial Failure/i).length).toBeGreaterThan(0);
  });
});
