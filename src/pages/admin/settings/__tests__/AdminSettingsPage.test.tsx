import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';

import { AdminSettingsPage } from '../index';

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: vi.fn(),
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

  it('filters launchpad cards by search keyword', async () => {
    renderPage();

    const searchInput = screen.getByPlaceholderText('Search configuration tools and features...');
    fireEvent.change(searchInput, { target: { value: 'email' } });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /email templates/i })).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /broadcast notifications/i }),
      ).not.toBeInTheDocument();
    });

    // Clear search
    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /broadcast notifications/i })).toBeInTheDocument();
    });
  });

  it('shows empty state when no features match search', async () => {
    renderPage();

    const searchInput = screen.getByPlaceholderText('Search configuration tools and features...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent-feature' } });

    await waitFor(() => {
      expect(screen.getByText('No matching features found')).toBeInTheDocument();
    });
  });
});
