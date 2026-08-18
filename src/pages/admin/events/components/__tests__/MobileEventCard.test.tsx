import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { toRoute } from '@/config/constants';
import type { AdminEvent } from '@/lib/domain/events';

import { MobileEventCard } from '../MobileEventCard';

const event: AdminEvent = {
  id: 'event-1',
  slug: 'summer-gathering',
  title: 'Summer Gathering',
  description: 'A community event',
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
  created_by_admin_id: null,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
};

function renderCard(permissions: Partial<React.ComponentProps<typeof MobileEventCard>> = {}) {
  return render(
    <MemoryRouter>
      <MobileEventCard
        event={event}
        canWrite={false}
        canRead={false}
        canAccessCheckIn={false}
        {...permissions}
      />
    </MemoryRouter>,
  );
}

describe('MobileEventCard', () => {
  it('renders the event summary and status details', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Summer Gathering' })).toBeInTheDocument();
    expect(screen.getByText('summer-gathering')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Starts')).toBeInTheDocument();
    expect(screen.getByText('Reg. mode')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('Policy')).toBeInTheDocument();
    expect(screen.getByText('Allow Update')).toBeInTheDocument();
  });

  it('renders all permitted actions and routes', () => {
    renderCard({ canWrite: true, canRead: true, canAccessCheckIn: true });

    expect(screen.getByRole('link', { name: 'Edit Summer Gathering' })).toHaveAttribute(
      'href',
      toRoute('adminEventDetail', { id: event.id }),
    );
    expect(
      screen.getByRole('link', { name: 'View attendees for Summer Gathering' }),
    ).toHaveAttribute('href', toRoute('adminAttendanceData', { id: event.id }));

    fireEvent.click(screen.getByRole('button', { name: 'More actions for Summer Gathering' }));

    expect(screen.getByRole('link', { name: 'Attendance settings' })).toHaveAttribute(
      'href',
      toRoute('adminEventAttendance', { id: event.id }),
    );
    expect(screen.getByRole('link', { name: 'Registration fields' })).toHaveAttribute(
      'href',
      toRoute('adminEventFields', { id: event.id }),
    );
    expect(screen.getByRole('link', { name: 'Registrations' })).toHaveAttribute(
      'href',
      toRoute('adminRegistrations', { id: event.id }),
    );
    expect(screen.getByRole('link', { name: 'Check-in' })).toHaveAttribute(
      'href',
      toRoute('adminAttendanceCheckIn', { id: event.id }),
    );
  });

  it('shows read actions without write-only menu actions', () => {
    renderCard({ canRead: true });

    expect(
      screen.getByRole('link', { name: 'View attendees for Summer Gathering' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit Summer Gathering' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'More actions for Summer Gathering' }));

    expect(screen.getByRole('link', { name: 'Registrations' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendance settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Registration fields' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Check-in' })).not.toBeInTheDocument();
  });

  it('shows write actions without read-only menu actions', () => {
    renderCard({ canWrite: true });

    expect(screen.getByRole('link', { name: 'Edit Summer Gathering' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'View attendees for Summer Gathering' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'More actions for Summer Gathering' }));

    expect(screen.getByRole('link', { name: 'Attendance settings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registration fields' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Registrations' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Check-in' })).not.toBeInTheDocument();
  });

  it('shows only check-in access when no other permissions are granted', () => {
    renderCard({ canAccessCheckIn: true });

    expect(screen.queryByRole('link', { name: 'Edit Summer Gathering' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'View attendees for Summer Gathering' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'More actions for Summer Gathering' }));

    expect(screen.getByRole('link', { name: 'Check-in' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendance settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Registration fields' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Registrations' })).not.toBeInTheDocument();
  });

  it('hides all actions when the user has no permissions', () => {
    renderCard();

    expect(screen.queryByRole('link', { name: 'Edit Summer Gathering' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'View attendees for Summer Gathering' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'More actions for Summer Gathering' }),
    ).not.toBeInTheDocument();
  });
});
