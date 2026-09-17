import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';

import { AdminBaseNavigation } from '../AdminBaseNavigation';

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: vi.fn(),
}));

describe('AdminBaseNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard links (Events, Forms) and checks role-specific tabs for admin', () => {
    vi.mocked(useAdminAuthQuery).mockReturnValue({
      data: {
        adminRole: 'admin',
        isAuthenticated: true,
        session: null,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useAdminAuthQuery>);

    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.adminEvents]}>
        <AdminBaseNavigation />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminEvents,
    );
    expect(screen.getByRole('link', { name: 'Forms' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminForms,
    );
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminMembers,
    );
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminServices,
    );
    // User Roles is super_admin only
    expect(screen.queryByRole('link', { name: 'User Roles' })).not.toBeInTheDocument();
  });

  it('renders User Roles tab when user is super_admin', () => {
    vi.mocked(useAdminAuthQuery).mockReturnValue({
      data: {
        adminRole: 'super_admin',
        isAuthenticated: true,
        session: null,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useAdminAuthQuery>);

    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.adminUserRoles]}>
        <AdminBaseNavigation />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'User Roles' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminUserRoles,
    );
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminServices,
    );
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminMembers,
    );
  });

  it('hides Members, User Roles, and Services for kiosk role', () => {
    vi.mocked(useAdminAuthQuery).mockReturnValue({
      data: {
        adminRole: 'kiosk',
        isAuthenticated: true,
        session: null,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useAdminAuthQuery>);

    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.adminEvents]}>
        <AdminBaseNavigation />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forms' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Members' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'User Roles' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Services' })).not.toBeInTheDocument();
  });
});
