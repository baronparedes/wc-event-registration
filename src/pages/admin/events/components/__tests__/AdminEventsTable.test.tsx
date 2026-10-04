import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { AdminEvent } from '@/lib/domain/events';

import { AdminEventsTable } from '../AdminEventsTable';

const mockEvent: AdminEvent = {
  id: 'event-1',
  slug: 'test-event',
  title: 'Test Event',
  description: 'Test Event Description',
  location: 'Test Location',
  starts_at: '2025-01-01T00:00:00Z',
  ends_at: '2025-01-01T23:59:59Z',
  registration_opens_at: null,
  registration_closes_at: null,
  status: 'published',
  duplicate_policy: 'block',
  require_id_lookup: true,
  registration_mode: 'open',
  allow_public_registrations: false,
  metadata: {},
  created_by_admin_id: 'admin-1',
  created_at: '2024-12-01T00:00:00Z',
  updated_at: '2024-12-01T00:00:00Z',
  member_registration_count: 5,
  public_registration_count: 2,
};

const mockEvent2: AdminEvent = {
  id: 'event-2',
  slug: 'another-event',
  title: 'Another Event',
  description: 'Another Event Description',
  location: 'Another Location',
  starts_at: '2025-02-01T00:00:00Z',
  ends_at: '2025-02-01T23:59:59Z',
  registration_opens_at: null,
  registration_closes_at: null,
  status: 'draft',
  duplicate_policy: 'allow_multiple',
  require_id_lookup: true,
  registration_mode: 'closed',
  allow_public_registrations: true,
  metadata: {},
  created_by_admin_id: 'admin-1',
  created_at: '2024-12-01T00:00:00Z',
  updated_at: '2024-12-01T00:00:00Z',
  member_registration_count: 10,
  public_registration_count: 0,
};

const mockEvents = [mockEvent, mockEvent2];

const setup = (props: Partial<React.ComponentProps<typeof AdminEventsTable>> = {}) => {
  const defaultProps = {
    events: mockEvents,
    canWrite: true,
    canRead: true,
    canAccessCheckIn: true,
    onEventSelect: vi.fn(),
    onDuplicateClick: vi.fn(),
    onShareClick: vi.fn(),
  };

  const finalProps = { ...defaultProps, ...props };

  return {
    ...render(
      <MemoryRouter>
        <AdminEventsTable {...finalProps} />
      </MemoryRouter>,
    ),
    props: finalProps,
  };
};

describe('AdminEventsTable', () => {
  it('renders events correctly', () => {
    setup();

    // Check Event 1
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('test-event')).toBeInTheDocument();
    expect(screen.getByText('Test Location')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Block')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();

    // Check Event 2
    expect(screen.getByText('Another Event')).toBeInTheDocument();
    expect(screen.getByText('another-event')).toBeInTheDocument();
    expect(screen.getByText('Another Location')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();

    // Check registration counts
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders an empty state or nothing when no events are provided', () => {
    // Depending on the ListTable implementation, this might just render headers
    setup({ events: [] });
    expect(screen.queryByText('Test Event')).not.toBeInTheDocument();
  });

  describe('Role-based rendering', () => {
    it('shows all actions when user has all permissions', () => {
      setup();

      const editButtons = screen.getAllByRole('link', { name: /Edit/i });
      expect(editButtons).toHaveLength(2);

      const duplicateButtons = screen.getAllByRole('button', { name: /Duplicate/i });
      expect(duplicateButtons).toHaveLength(2);

      const shareButtons = screen.getAllByRole('button', { name: /Share Schedule/i });
      expect(shareButtons).toHaveLength(2);

      const attendanceButtons = screen.getAllByRole('link', { name: /Attendance/i });
      expect(attendanceButtons).toHaveLength(2);

      const fieldsButtons = screen.getAllByRole('link', { name: /Fields/i });
      expect(fieldsButtons).toHaveLength(2);

      const attendeeDetailsButtons = screen.getAllByRole('link', { name: /Attendee Details/i });
      expect(attendeeDetailsButtons).toHaveLength(2);

      const registrationsButtons = screen.getAllByRole('link', { name: /Registrations/i });
      expect(registrationsButtons).toHaveLength(2);

      const checkInButtons = screen.getAllByRole('link', { name: /Check-In/i });
      expect(checkInButtons).toHaveLength(2);
    });

    it('hides write actions when canWrite is false', () => {
      setup({ canWrite: false });

      expect(screen.queryByRole('link', { name: /Edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Duplicate/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Attendance/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Fields/i })).not.toBeInTheDocument();

      // Read, share, and check-in actions should still be visible
      expect(screen.getAllByRole('button', { name: /Share Schedule/i })).toHaveLength(2);
      expect(screen.getAllByRole('link', { name: /Attendee Details/i })).toHaveLength(2);
      expect(screen.getAllByRole('link', { name: /Check-In/i })).toHaveLength(2);
    });

    it('hides read actions when canRead is false', () => {
      setup({ canRead: false });

      expect(screen.queryByRole('button', { name: /Share Schedule/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Attendee Details/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Registrations/i })).not.toBeInTheDocument();

      // Write and check-in actions should still be visible
      expect(screen.getAllByRole('link', { name: /Edit/i })).toHaveLength(2);
      expect(screen.getAllByRole('link', { name: /Check-In/i })).toHaveLength(2);
    });

    it('hides check-in action when canAccessCheckIn is false', () => {
      setup({ canAccessCheckIn: false });

      expect(screen.queryByRole('link', { name: /Check-In/i })).not.toBeInTheDocument();

      // Write and read actions should still be visible
      expect(screen.getAllByRole('link', { name: /Edit/i })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: /Share Schedule/i })).toHaveLength(2);
      expect(screen.getAllByRole('link', { name: /Attendee Details/i })).toHaveLength(2);
    });
  });

  describe('Interactions', () => {
    it('calls onEventSelect when a row is clicked and canWrite is true', () => {
      const { props } = setup({ canWrite: true });

      const rowText = screen.getByText('Test Event');
      fireEvent.click(rowText);

      expect(props.onEventSelect).toHaveBeenCalledWith('event-1');
    });

    it('does not call onEventSelect when a row is clicked but canWrite is false', () => {
      const { props } = setup({ canWrite: false });

      const rowText = screen.getByText('Test Event');
      fireEvent.click(rowText);

      expect(props.onEventSelect).not.toHaveBeenCalled();
    });

    it('calls onDuplicateClick when duplicate button is clicked', () => {
      const { props } = setup();

      const duplicateButtons = screen.getAllByRole('button', { name: /Duplicate/i });
      fireEvent.click(duplicateButtons[0]);

      expect(props.onDuplicateClick).toHaveBeenCalledWith(mockEvent);
      expect(props.onEventSelect).not.toHaveBeenCalled();
    });

    it('calls onShareClick when share schedule button is clicked', () => {
      const { props } = setup();

      const shareButtons = screen.getAllByRole('button', { name: /Share Schedule/i });
      fireEvent.click(shareButtons[0]);

      expect(props.onShareClick).toHaveBeenCalledWith(mockEvent);
      expect(props.onEventSelect).not.toHaveBeenCalled();
    });
  });
});
