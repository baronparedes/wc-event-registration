import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useDebounceSearch } from '@/hooks/utils';

import { AdminSettingsPage } from '../index';

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: vi.fn(),
}));

vi.mock('@/hooks/utils', () => ({
  useDebounceSearch: vi.fn(),
}));

describe('AdminSettingsPage', () => {
  let queryClient: QueryClient;

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
        adminRole: 'super_admin',
        isAuthenticated: true,
        session: null,
      },
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(useDebounceSearch).mockReturnValue({
      searchTerm: '',
      setSearchTerm: vi.fn(),
      normalizedSearchTerm: '',
      clearSearch: vi.fn(),
    } as never);
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AdminSettingsPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('renders settings launchpad header, categories, and feature cards', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Settings & Launchpad' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Communications & Messaging')).toBeInTheDocument();
    expect(screen.getByText('Access & Security')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /broadcast notifications/i })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminNotifications,
    );
    expect(screen.getByRole('link', { name: /sunday service reminders/i })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminSundayReminders,
    );
    expect(screen.getByRole('link', { name: /broadcast dashboard/i })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminNotificationsDashboard,
    );
    expect(screen.getByRole('link', { name: /email templates/i })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminSettingsEmailTemplates,
    );
    expect(screen.getByRole('link', { name: /user roles & permissions/i })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminUserRoles,
    );
  });

  it('hides super_admin restricted tools from standard admin', () => {
    vi.mocked(useAdminAuthQuery).mockReturnValue({
      data: {
        adminRole: 'admin',
        isAuthenticated: true,
        session: null,
      },
      isLoading: false,
      error: null,
    } as never);

    renderPage();

    expect(screen.getByRole('link', { name: /broadcast notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /email templates/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /user roles & permissions/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render disabled settings search controls', () => {
    renderPage();

    expect(
      screen.queryByPlaceholderText('Search configuration tools and features...'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });

  it('retains feature filtering behavior while the search controls are disabled', () => {
    vi.mocked(useDebounceSearch).mockReturnValue({
      searchTerm: 'email',
      setSearchTerm: vi.fn(),
      normalizedSearchTerm: 'email',
      clearSearch: vi.fn(),
    } as never);

    renderPage();

    expect(screen.getByRole('link', { name: /email templates/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /broadcast notifications/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Search configuration tools and features...'),
    ).not.toBeInTheDocument();
  });

  it('shows the no-match state without rendering search actions while disabled', () => {
    vi.mocked(useDebounceSearch).mockReturnValue({
      searchTerm: 'no matching setting',
      setSearchTerm: vi.fn(),
      normalizedSearchTerm: 'no matching setting',
      clearSearch: vi.fn(),
    } as never);

    renderPage();

    expect(screen.getByText('No matching features found')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear Search' })).not.toBeInTheDocument();
  });
});
