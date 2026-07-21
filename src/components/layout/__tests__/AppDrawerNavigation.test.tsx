import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';

import { AppDrawerNavigation } from '../AppDrawerNavigation';

const { mockUseAdminEventQuery } = vi.hoisted(() => ({
  mockUseAdminEventQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/events', () => ({
  useAdminEventQuery: (...args: unknown[]) => mockUseAdminEventQuery(...args),
}));

function renderDrawer(options?: {
  path?: string;
  isOpen?: boolean;
  isAuthenticated?: boolean;
  adminRole?: 'admin' | 'super_admin' | 'slod' | null;
  currentUserLabel?: string | null;
  onClose?: () => void;
  onLogout?: () => Promise<void>;
}) {
  const onClose = options?.onClose ?? vi.fn();
  const onLogout = options?.onLogout ?? vi.fn().mockResolvedValue(undefined);

  render(
    <MemoryRouter initialEntries={[options?.path ?? ROUTE_PATHS.home]}>
      <AppDrawerNavigation
        isOpen={options?.isOpen ?? true}
        onClose={onClose}
        isAuthenticated={options?.isAuthenticated ?? true}
        adminRole={options?.adminRole ?? 'admin'}
        currentUserLabel={options?.currentUserLabel ?? null}
        onLogout={onLogout}
      />
    </MemoryRouter>,
  );

  return { onClose, onLogout };
}

describe('AppDrawerNavigation', () => {
  it('does not render overlay when drawer is closed', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });

    renderDrawer({ isOpen: false });

    expect(screen.queryByLabelText('Close navigation drawer overlay')).not.toBeInTheDocument();
  });

  it('shows sign-in link for unauthenticated users', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });

    renderDrawer({ isAuthenticated: false, adminRole: null });

    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminLogin,
    );
    expect(screen.queryByRole('button', { name: 'Sign Out' })).not.toBeInTheDocument();
  });

  it('shows admin links and handles sign out for authenticated users', async () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
    const { onClose, onLogout } = renderDrawer({
      isAuthenticated: true,
      currentUserLabel: 'admin@example.com',
    });

    expect(screen.getByRole('link', { name: 'Manage Events' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminEvents,
    );
    expect(screen.getByRole('link', { name: 'Manage Members' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminMembers,
    );
    expect(screen.getByText('Signed in as admin@example.com (admin)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(onLogout).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('renders event workspace and attendance links with event title when on event routes', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: { title: 'Event Alpha' } });

    renderDrawer({ path: '/admin/events/event-1/fields' });

    expect(screen.getByText('Event Workspace')).toBeInTheDocument();
    expect(screen.getByText('Event Alpha')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Manage Event' })).toHaveAttribute(
      'href',
      '/admin/events/event-1',
    );
    expect(screen.getByRole('link', { name: 'Manage Attendance' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance',
    );

    expect(screen.getByRole('link', { name: 'Check-In' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance/check-in',
    );
    expect(screen.getByRole('link', { name: 'Attendance Fields' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance/fields',
    );
    expect(screen.getByRole('link', { name: 'Attendee Details' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance/data',
    );
    expect(screen.getByRole('link', { name: 'Unregistered Members' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance/unregistered-members',
    );
  });

  it('uses event id as fallback label when event title is unavailable', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });

    renderDrawer({ path: '/admin/events/event-fallback/registrations' });

    expect(screen.getByText('event-fallback')).toBeInTheDocument();
  });

  it('does not render event workspace for new event route variants', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });

    renderDrawer({ path: '/admin/events/new/extra' });

    expect(screen.queryByText('Event Workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('Attendance')).not.toBeInTheDocument();
  });

  it('closes when overlay or close button is clicked', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
    const { onClose } = renderDrawer();

    fireEvent.click(screen.getByLabelText('Close navigation drawer overlay'));
    fireEvent.click(screen.getByLabelText('Close navigation drawer'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('invokes onClose when clicking navigation links', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: { title: 'Event Alpha' } });
    const { onClose } = renderDrawer({ path: '/admin/events/event-1' });

    fireEvent.click(screen.getByRole('link', { name: 'Manage Event' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides write-only links for slod users while preserving read navigation', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: { title: 'Event Alpha' } });

    renderDrawer({ path: '/admin/events/event-1/registrations', adminRole: 'slod' });

    expect(screen.getByRole('link', { name: 'Manage Members' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminMembers,
    );
    expect(screen.queryByRole('link', { name: 'Manage Event' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Manage Registration Fields' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage Attendance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Check-In' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendance Fields' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Unregistered Members' })).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Manage Events' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminEvents,
    );
    expect(screen.getByRole('link', { name: 'Manage Registrations' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/registrations',
    );
    expect(screen.getByRole('link', { name: 'Manage Public Registrations' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/public-registrations',
    );
    expect(screen.getByRole('link', { name: 'Attendee Details' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance/data',
    );
  });
});
