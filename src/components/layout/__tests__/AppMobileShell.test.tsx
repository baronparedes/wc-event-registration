import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS, TOAST_MESSAGES } from '@/config/constants';

import { AppMobileShell } from '../AppMobileShell';

const { mockUseAdminAuthQuery, mockMutateAsync, mockToastSuccess, mockToastError } = vi.hoisted(
  () => ({
    mockUseAdminAuthQuery: vi.fn(),
    mockMutateAsync: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
  }),
);

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => mockUseAdminAuthQuery(),
  useAdminLogoutMutation: () => ({ mutateAsync: mockMutateAsync }),
}));

vi.mock('../AppDrawerNavigation', () => ({
  AppDrawerNavigation: (props: {
    isOpen: boolean;
    onClose: () => void;
    isAuthenticated: boolean;
    adminRole?: 'admin' | 'super_admin' | 'slod' | 'kiosk' | null;
    currentUserLabel?: string | null;
    onLogout: () => Promise<void>;
  }) =>
    props.isOpen ? (
      <div>
        {props.currentUserLabel && (
          <p>
            Signed in as {props.currentUserLabel}
            {props.adminRole ? ` (${props.adminRole})` : ''}
          </p>
        )}
        <a href={ROUTE_PATHS.home}>Events</a>
        {props.isAuthenticated ? (
          <>
            <a href={ROUTE_PATHS.adminEvents}>Manage Events</a>
            <a href={ROUTE_PATHS.adminMembers}>Manage Members</a>
            <button
              onClick={() => {
                void props.onLogout();
              }}
              type="button"
            >
              Sign Out
            </button>
          </>
        ) : (
          <a href={ROUTE_PATHS.adminLogin}>Sign In</a>
        )}
      </div>
    ) : null,
}));

function renderShell(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="*" element={<AppMobileShell />}>
          <Route path="*" element={<div>Outlet Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppMobileShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  it('shows drawer actions for unauthenticated users', () => {
    mockUseAdminAuthQuery.mockReturnValue({ data: { isAuthenticated: false } });

    renderShell('/admin/events');

    fireEvent.click(screen.getByRole('button', { name: 'Open app navigation drawer' }));

    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminLogin,
    );
  });

  it('shows events entry in drawer', () => {
    mockUseAdminAuthQuery.mockReturnValue({
      data: {
        isAuthenticated: true,
        adminRole: 'admin',
        session: { user: { email: 'admin@example.com' } },
      },
    });

    renderShell('/');

    fireEvent.click(screen.getByRole('button', { name: 'Open app navigation drawer' }));

    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute('href', ROUTE_PATHS.home);
    expect(screen.getByText('Signed in as admin@example.com (admin)')).toBeInTheDocument();
  });

  it('handles successful mobile sign out', async () => {
    mockUseAdminAuthQuery.mockReturnValue({ data: { isAuthenticated: true } });

    renderShell('/');

    fireEvent.click(screen.getByRole('button', { name: 'Open app navigation drawer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockToastSuccess).toHaveBeenCalledWith(TOAST_MESSAGES.adminSignOutSuccess);
    });
  });

  it('handles failed mobile sign out', async () => {
    mockUseAdminAuthQuery.mockReturnValue({ data: { isAuthenticated: true } });
    mockMutateAsync.mockRejectedValue(new Error('mobile logout failed'));

    renderShell('/');

    fireEvent.click(screen.getByRole('button', { name: 'Open app navigation drawer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('mobile logout failed');
    });
  });

  it('uses fallback sign-out error message for non-Error failures', async () => {
    mockUseAdminAuthQuery.mockReturnValue({ data: { isAuthenticated: true } });
    mockMutateAsync.mockRejectedValue('unknown');

    renderShell('/');

    fireEvent.click(screen.getByRole('button', { name: 'Open app navigation drawer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(TOAST_MESSAGES.adminSignOutFailure);
    });
  });
});
