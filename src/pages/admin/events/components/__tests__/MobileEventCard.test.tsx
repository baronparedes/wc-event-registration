import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { AdminEvent } from '@/lib/domain/events';

import { MobileEventCard } from '../MobileEventCard';

const event = {
  id: 'event-1',
  slug: 'summer-gathering',
  title: 'Summer Gathering',
  description: 'Community event',
  location: 'Main Hall',
  starts_at: '2026-08-15T09:00:00.000Z',
  ends_at: '2026-08-15T12:00:00.000Z',
  registration_opens_at: '2026-08-01T00:00:00.000Z',
  registration_closes_at: '2026-08-14T23:59:00.000Z',
  status: 'published',
  duplicate_policy: 'allow_update',
  require_id_lookup: true,
  registration_mode: 'open',
  allow_public_registrations: true,
  metadata: {},
  created_by_admin_id: 'admin-1',
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
} satisfies AdminEvent;

function renderCard(permissions: {
  canWrite: boolean;
  canRead: boolean;
  canAccessCheckIn: boolean;
}) {
  return render(
    <MemoryRouter>
      <MobileEventCard event={event} {...permissions} />
    </MemoryRouter>,
  );
}

describe('MobileEventCard', () => {
  it('renders event details and permission-gated primary actions', () => {
    renderCard({ canWrite: true, canRead: true, canAccessCheckIn: false });

    expect(screen.getByRole('heading', { name: 'Summer Gathering' })).toBeInTheDocument();
    expect(screen.getByText('summer-gathering')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Aug 15, 2026')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('Allow Update')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Edit Summer Gathering' })).toHaveAttribute(
      'href',
      '/admin/events/event-1',
    );
    expect(
      screen.getByRole('link', { name: 'View attendees for Summer Gathering' }),
    ).toHaveAttribute('href', '/admin/events/event-1/attendance/data');
  });

  it('shows write and read menu actions at their permission boundaries', () => {
    renderCard({ canWrite: true, canRead: true, canAccessCheckIn: true });

    fireEvent.click(screen.getByRole('button', { name: 'More actions for Summer Gathering' }));

    expect(screen.getByRole('link', { name: 'Attendance settings' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance',
    );
    expect(screen.getByRole('link', { name: 'Registration fields' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/fields',
    );
    expect(screen.getByRole('link', { name: 'Registrations' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/registrations',
    );
    expect(screen.getByRole('link', { name: 'Check-in' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance/check-in',
    );
  });

  it('renders only check-in access for a check-in-only user', () => {
    renderCard({ canWrite: false, canRead: false, canAccessCheckIn: true });

    expect(screen.queryByRole('link', { name: 'Edit Summer Gathering' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'View attendees for Summer Gathering' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'More actions for Summer Gathering' }));

    expect(screen.getByRole('link', { name: 'Check-in' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance/check-in',
    );
    expect(screen.queryByRole('link', { name: 'Attendance settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Registration fields' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Registrations' })).not.toBeInTheDocument();
  });

  it('hides the action footer when the user has no event permissions', () => {
    renderCard({ canWrite: false, canRead: false, canAccessCheckIn: false });

    expect(screen.queryByRole('link', { name: 'Edit Summer Gathering' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'View attendees for Summer Gathering' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'More actions for Summer Gathering' }),
    ).not.toBeInTheDocument();
  });
});
