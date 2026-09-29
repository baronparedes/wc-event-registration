import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBroadcastDashboardStatsQuery } from '@/hooks/domain/notifications';

import { AdminNotificationsDashboardPage } from '../index';

vi.mock('@/hooks/domain/notifications', () => ({
  useBroadcastDashboardStatsQuery: vi.fn(),
}));

describe('AdminNotificationsDashboardPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AdminNotificationsDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('renders loading state', () => {
    vi.mocked(useBroadcastDashboardStatsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as never);

    renderPage();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders dashboard with stats', () => {
    vi.mocked(useBroadcastDashboardStatsQuery).mockReturnValue({
      data: {
        total_users: 100,
        subscribed_users: 25,
        campaigns: [
          {
            id: '1',
            title: 'Test Campaign',
            message: 'Test Message',
            target_type: 'all',
            target_role: null,
            created_at: '2026-06-15T12:00:00Z',
            total_recipients: 50,
            read_count: 10,
          },
        ],
      },
      isLoading: false,
      error: null,
    } as never);

    renderPage();

    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('(25 out of 100 total users)')).toBeInTheDocument();
    expect(screen.getByText('Test Campaign')).toBeInTheDocument();
    expect(screen.getByText('All Users')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('renders dashboard with no campaigns', () => {
    vi.mocked(useBroadcastDashboardStatsQuery).mockReturnValue({
      data: {
        total_users: 100,
        subscribed_users: 0,
        campaigns: [],
      },
      isLoading: false,
      error: null,
    } as never);

    renderPage();

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('No campaigns found')).toBeInTheDocument();
  });

  it('renders error state', () => {
    vi.mocked(useBroadcastDashboardStatsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('test error'),
    } as never);

    renderPage();
    expect(screen.getByText('Error loading data')).toBeInTheDocument();
  });

  it('renders no data available', () => {
    vi.mocked(useBroadcastDashboardStatsQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as never);

    renderPage();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('handles campaign with total recipients 0', () => {
    vi.mocked(useBroadcastDashboardStatsQuery).mockReturnValue({
      data: {
        total_users: 100,
        subscribed_users: 25,
        campaigns: [
          {
            id: '1',
            title: 'Test Campaign',
            message: 'Test Message',
            target_type: 'role',
            target_role: 'admin',
            created_at: '2026-06-15T12:00:00Z',
            total_recipients: 0,
            read_count: 0,
          },
        ],
      },
      isLoading: false,
      error: null,
    } as never);

    renderPage();

    expect(screen.getByText('0%')).toBeInTheDocument(); // read rate
    expect(screen.getByText('Role: admin')).toBeInTheDocument();
  });

  it('renders multi-role campaign read metrics', () => {
    vi.mocked(useBroadcastDashboardStatsQuery).mockReturnValue({
      data: {
        total_users: 100,
        subscribed_users: 25,
        campaigns: [
          {
            id: 'multi-role-campaign',
            title: 'Test Role Campaign',
            message: 'Test Message',
            target_type: 'role',
            target_role: 'Prayer Coach, Usher',
            created_at: '2026-06-15T12:00:00Z',
            total_recipients: 5,
            read_count: 2,
          },
        ],
      },
      isLoading: false,
      error: null,
    } as never);

    renderPage();

    expect(screen.getByText('Test Role Campaign')).toBeInTheDocument();
    expect(screen.getByText('Role: Prayer Coach, Usher')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('shows zero subscription percentage when the member base is empty', () => {
    vi.mocked(useBroadcastDashboardStatsQuery).mockReturnValue({
      data: {
        total_users: 0,
        subscribed_users: 0,
        campaigns: [],
      },
      isLoading: false,
      error: null,
    } as never);

    renderPage();

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('(0 out of 0 total users)')).toBeInTheDocument();
  });
});
