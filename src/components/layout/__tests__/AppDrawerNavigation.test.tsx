import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';
import { ROUTE_PATHS } from '@/config/constants';

import { AppDrawerNavigation } from '../AppDrawerNavigation';

const { mockUseAdminEventQuery, mockUseCurrentProfileQuery, mockUseMemberAvatarQuery } = vi.hoisted(
  () => ({
    mockUseAdminEventQuery: vi.fn(),
    mockUseCurrentProfileQuery: vi.fn(),
    mockUseMemberAvatarQuery: vi.fn(),
  }),
);

vi.mock('@/hooks/domain/events', () => ({
  useAdminEventQuery: (...args: unknown[]) => mockUseAdminEventQuery(...args),
}));

vi.mock('@/hooks/domain/members', () => ({
  useCurrentProfileQuery: () => mockUseCurrentProfileQuery(),
  useMemberAvatarQuery: (...args: unknown[]) => mockUseMemberAvatarQuery(...args),
}));

function renderDrawer(options?: {
  path?: string;
  isOpen?: boolean;
  isAuthenticated?: boolean;
  hasSession?: boolean;
  adminRole?: 'admin' | 'super_admin' | 'slod' | 'imt' | 'kiosk' | null;
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
        hasSession={options?.hasSession ?? options?.isAuthenticated ?? true}
        adminRole={options?.adminRole === undefined ? 'admin' : options.adminRole}
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
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });

    renderDrawer({ isOpen: false });

    expect(screen.queryByLabelText('Close navigation drawer overlay')).not.toBeInTheDocument();
  });

  it('shows Hub link and sign-in link for unauthenticated users and hides My Profile link', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });

    renderDrawer({ isAuthenticated: false, hasSession: false, adminRole: null });

    expect(screen.getByRole('link', { name: 'Hub' })).toHaveAttribute('href', ROUTE_PATHS.home);
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.login,
    );
    expect(screen.queryByRole('link', { name: 'My Profile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign Out' })).not.toBeInTheDocument();
  });

  it('shows My Profile link and avatar when user has a session and matching member profile', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });
    const member = makeAdminMember({ full_name: 'John Smith' });
    mockUseCurrentProfileQuery.mockReturnValue({ data: member });

    renderDrawer({
      isAuthenticated: false,
      hasSession: true,
      adminRole: null,
      currentUserLabel: member.email,
    });

    expect(screen.getByRole('link', { name: 'My Profile' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.profile,
    );
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('hides My Profile link when user has a session but no matching member profile', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });

    renderDrawer({
      isAuthenticated: false,
      hasSession: true,
      adminRole: null,
      currentUserLabel: 'unknown@example.com',
    });

    expect(screen.queryByRole('link', { name: 'My Profile' })).not.toBeInTheDocument();
  });

  it('shows user identity and sign-out for authenticated non-admin users while hiding admin links', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });

    renderDrawer({
      isAuthenticated: false,
      hasSession: true,
      adminRole: null,
      currentUserLabel: 'member@example.com',
    });

    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.getByText('member@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage Events' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage Members' })).not.toBeInTheDocument();
  });

  it('shows admin links and handles sign out for authenticated users', async () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });
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
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('(admin)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(onLogout).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows member navigation for imt users without admin write links', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });

    renderDrawer({ isAuthenticated: true, adminRole: 'imt' });

    expect(screen.getByRole('link', { name: 'Manage Members' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminMembers,
    );
    expect(screen.queryByRole('link', { name: 'Manage Events' })).not.toBeInTheDocument();
  });

  it('renders event workspace and attendance links with event title when on event routes', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: { title: 'Event Alpha' } });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });

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
      '/admin/events/event-1/registrations/unregistered-members',
    );
  });

  it('uses event id as fallback label when event title is unavailable', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });

    renderDrawer({ path: '/admin/events/event-fallback/registrations' });

    expect(screen.getByText('event-fallback')).toBeInTheDocument();
  });

  it('does not render event workspace for new event route variants', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });

    renderDrawer({ path: '/admin/events/new/extra' });

    expect(screen.queryByText('Event Workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('Attendance')).not.toBeInTheDocument();
  });

  it('closes when overlay or close button is clicked', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });
    const { onClose } = renderDrawer();

    fireEvent.click(screen.getByLabelText('Close navigation drawer overlay'));
    fireEvent.click(screen.getByLabelText('Close navigation drawer'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('invokes onClose when clicking navigation links', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: { title: 'Event Alpha' } });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });
    const { onClose } = renderDrawer({ path: '/admin/events/event-1' });

    fireEvent.click(screen.getByRole('link', { name: 'Manage Event' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides write-only links for slod users while preserving read navigation', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: { title: 'Event Alpha' } });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });

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

  it('shows check-in only navigation for kiosk users on event routes', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: { title: 'Event Alpha' } });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });

    renderDrawer({ path: '/admin/events/event-1/attendance/check-in', adminRole: 'kiosk' });

    expect(screen.getByRole('link', { name: 'Check-In' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance/check-in',
    );
    expect(screen.queryByRole('link', { name: 'Manage Events' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage Members' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage Event' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage Attendance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage Registrations' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Manage Public Registrations' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendee Details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendance Fields' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendance Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Unregistered Members' })).not.toBeInTheDocument();
  });
});
