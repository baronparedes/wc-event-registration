import { act } from 'react';

import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';

import { AdminDrawerToggle, AdminNavigationDrawer } from '../AdminNavigationDrawer';
import { useAdminDrawer } from '../useAdminDrawer';

describe('AdminNavigationDrawer', () => {
  function renderDrawer(props?: {
    isOpen?: boolean;
    onClose?: () => void;
    adminRole?: 'admin' | 'super_admin' | 'slod' | 'imt' | 'kiosk' | null;
    showAllAdminLinks?: boolean;
  }) {
    const onClose = props?.onClose ?? vi.fn();

    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.home]}>
        <AdminNavigationDrawer
          isOpen={props?.isOpen ?? true}
          onClose={onClose}
          adminRole={props?.adminRole === undefined ? 'admin' : props.adminRole}
          showAllAdminLinks={props?.showAllAdminLinks ?? false}
        />
      </MemoryRouter>,
    );

    return { onClose };
  }

  it('renders all four admin links with large senior-friendly touch targets when opened', () => {
    renderDrawer({ isOpen: true, adminRole: 'super_admin' });

    const manageEvents = screen.getByRole('link', { name: /Manage Events/i });
    const manageForms = screen.getByRole('link', { name: /Manage Forms/i });
    const manageMembers = screen.getByRole('link', { name: /Manage Members/i });
    const userRoles = screen.getByRole('link', { name: /User Roles/i });

    expect(manageEvents).toHaveAttribute('href', ROUTE_PATHS.adminEvents);
    expect(manageForms).toHaveAttribute('href', ROUTE_PATHS.adminForms);
    expect(manageMembers).toHaveAttribute('href', ROUTE_PATHS.adminMembers);
    expect(userRoles).toHaveAttribute('href', ROUTE_PATHS.adminUserRoles);

    // Verify touch target requirements for senior users
    expect(manageEvents.className).toContain('min-h-[48px]');
    expect(manageEvents.className).toContain('px-4');
    expect(manageEvents.className).toContain('py-3');
    expect(manageEvents.className).toContain('text-base');

    expect(manageForms.className).toContain('min-h-[48px]');
    expect(manageMembers.className).toContain('min-h-[48px]');
    expect(userRoles.className).toContain('min-h-[48px]');
  });

  it('displays all links when showAllAdminLinks is true regardless of role', () => {
    renderDrawer({ isOpen: true, adminRole: null, showAllAdminLinks: true });

    expect(screen.getByRole('link', { name: /Manage Events/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manage Forms/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manage Members/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /User Roles/i })).toBeInTheDocument();
  });

  it('calls onClose when overlay backdrop is clicked', () => {
    const { onClose } = renderDrawer({ isOpen: true });

    const overlay = screen.getByLabelText('Close admin navigation drawer overlay');
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const { onClose } = renderDrawer({ isOpen: true });

    const closeBtn = screen.getByRole('button', { name: 'Close admin navigation drawer' });
    expect(closeBtn.className).toContain('min-h-[44px]');
    expect(closeBtn.className).toContain('min-w-[44px]');

    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const { onClose } = renderDrawer({ isOpen: true });

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when an admin link is clicked', () => {
    const { onClose } = renderDrawer({ isOpen: true, adminRole: 'super_admin' });

    fireEvent.click(screen.getByRole('link', { name: /Manage Events/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render backdrop overlay when isOpen is false', () => {
    renderDrawer({ isOpen: false });

    expect(
      screen.queryByLabelText('Close admin navigation drawer overlay'),
    ).not.toBeInTheDocument();
  });
});

describe('AdminDrawerToggle', () => {
  it('renders with senior-friendly large touch targets and triggers onToggle', () => {
    const onToggle = vi.fn();

    render(<AdminDrawerToggle isOpen={false} onToggle={onToggle} label="Admin Menu" />);

    const button = screen.getByRole('button', { name: 'Open admin navigation drawer' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button.className).toContain('min-h-[48px]');
    expect(button.className).toContain('min-w-[48px]');
    expect(button).toHaveTextContent('Admin Menu');

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('useAdminDrawer hook', () => {
  it('manages drawer open/close state correctly', () => {
    const { result } = renderHook(() => useAdminDrawer(false));

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.openDrawer();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.closeDrawer();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggleDrawer();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggleDrawer();
    });
    expect(result.current.isOpen).toBe(false);
  });
});
