import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminRole } from '@/lib/domain/auth';

import { EventNavigationLinks } from '../EventNavigationLinks';

const { mockUseAdminAuthQuery } = vi.hoisted(() => ({
  mockUseAdminAuthQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/auth', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/auth')>('@/hooks/domain/auth');
  return {
    ...actual,
    useAdminAuthQuery: (...args: unknown[]) => mockUseAdminAuthQuery(...args),
  };
});

function renderNavigation(role: AdminRole | null) {
  mockUseAdminAuthQuery.mockReturnValue({
    data: {
      isAuthenticated: Boolean(role),
      adminRole: role,
    },
  });

  render(
    <MemoryRouter>
      <EventNavigationLinks eventId="event-1" currentSection="event" />
    </MemoryRouter>,
  );
}

describe('EventNavigationLinks', () => {
  beforeEach(() => {
    mockUseAdminAuthQuery.mockReset();
  });

  it('shows all event navigation links for write-enabled admins', () => {
    renderNavigation('admin');

    expect(screen.getByRole('link', { name: 'Event' })).toHaveAttribute(
      'href',
      '/admin/events/event-1',
    );
    expect(screen.getByRole('link', { name: 'Fields' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/fields',
    );
    expect(screen.getByRole('link', { name: 'Registrations' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/registrations',
    );
    expect(screen.getByRole('link', { name: 'Attendance' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance',
    );
    expect(screen.getByRole('link', { name: 'Attendee Details' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance/data',
    );
    expect(screen.getByRole('link', { name: 'Check-In' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance/check-in',
    );
  });

  it('hides write-only and check-in links for slod while preserving read links', () => {
    renderNavigation('slod');

    expect(screen.queryByRole('link', { name: 'Event' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Fields' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Check-In' })).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Registrations' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/registrations',
    );
    expect(screen.getByRole('link', { name: 'Attendee Details' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance/data',
    );
  });

  it('shows only check-in link for kiosk role', () => {
    renderNavigation('kiosk');

    expect(screen.getByRole('link', { name: 'Check-In' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance/check-in',
    );
    expect(screen.queryByRole('link', { name: 'Event' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Fields' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Registrations' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendee Details' })).not.toBeInTheDocument();
  });

  it('hides all links for users without admin role', () => {
    renderNavigation(null);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
