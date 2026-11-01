import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { type AdminPermissionKey, canAdminPerform } from '@/lib/domain/auth';

import { AdminBaseNavigation } from '../AdminBaseNavigation';

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: vi.fn(),
}));

function mockAuthReturn(data: {
  adminRole: string;
  isAuthenticated: boolean;
  session: null;
  permissions?: AdminPermissionKey[];
}) {
  return {
    data,
    isLoading: false,
    error: null,
    can: (perm: Parameters<typeof canAdminPerform>[1]) =>
      canAdminPerform(data as Parameters<typeof canAdminPerform>[0], perm),
  } as unknown as ReturnType<typeof useAdminAuthQuery>;
}

describe('AdminBaseNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard links (Events, Forms) and checks role-specific tabs for admin', () => {
    vi.mocked(useAdminAuthQuery).mockReturnValue(
      mockAuthReturn({
        adminRole: 'admin',
        isAuthenticated: true,
        session: null,
        permissions: [
          'canWriteAdminData',
          'canReadAdminData',
          'canReadAdminMemberData',
          'canManageServices',
        ],
      }),
    );

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
    expect(screen.getByRole('link', { name: 'Approvals' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminApprovals,
    );
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminMembers,
    );
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminServices,
    );
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminSettings,
    );
    // User Roles is super_admin only
    expect(screen.queryByRole('link', { name: 'User Roles' })).not.toBeInTheDocument();
  });

  it('renders standard and admin tabs when user is super_admin', () => {
    vi.mocked(useAdminAuthQuery).mockReturnValue(
      mockAuthReturn({
        adminRole: 'super_admin',
        isAuthenticated: true,
        session: null,
        permissions: [
          'canWriteAdminData',
          'canReadAdminData',
          'canReadAdminMemberData',
          'canManageServices',
          'canManageAdminRoles',
        ],
      }),
    );

    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.adminSettings]}>
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
    expect(screen.getByRole('link', { name: 'Approvals' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminApprovals,
    );
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminMembers,
    );
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminServices,
    );
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminSettings,
    );
    expect(screen.queryByRole('link', { name: 'User Roles' })).not.toBeInTheDocument();
  });

  it('hides Members, User Roles, and Services for kiosk role', () => {
    vi.mocked(useAdminAuthQuery).mockReturnValue(
      mockAuthReturn({
        adminRole: 'kiosk',
        isAuthenticated: true,
        session: null,
      }),
    );

    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.adminEvents]}>
        <AdminBaseNavigation />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forms' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Approvals' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Members' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'User Roles' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Services' })).not.toBeInTheDocument();
  });

  it('renders Members and Services tabs for slod role', () => {
    vi.mocked(useAdminAuthQuery).mockReturnValue(
      mockAuthReturn({
        adminRole: 'slod',
        isAuthenticated: true,
        session: null,
        permissions: ['canReadAdminData', 'canReadAdminMemberData', 'canManageServices'],
      }),
    );

    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.adminEvents]}>
        <AdminBaseNavigation />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forms' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Approvals' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminApprovals,
    );
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminMembers,
    );
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminServices,
    );
    expect(screen.queryByRole('link', { name: 'User Roles' })).not.toBeInTheDocument();
  });
});
