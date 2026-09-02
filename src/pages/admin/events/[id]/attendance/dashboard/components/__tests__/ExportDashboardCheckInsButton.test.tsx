import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AttendeeSearchResult } from '@/lib/domain/attendance';

import { ExportDashboardCheckInsButton } from '../ExportDashboardCheckInsButton';

function makeAttendee(overrides: Partial<AttendeeSearchResult>): AttendeeSearchResult {
  return {
    attendee_kind: 'registered',
    registration_id: 'reg-1',
    public_registration_id: null,
    user_id: 'user-1',
    member_id: 'MID-001',
    nickname: 'Alpha',
    last_name: 'Member',
    full_name: 'Alpha Member',
    email: 'alpha@example.com',
    role: 'Member',
    category: 'Adult',
    registration_status: 'submitted',
    submitted_at: '2026-07-22T00:00:00.000Z',
    check_in_status: 'checked_in',
    official_check_in_time: '2026-07-22T08:00:00.000Z',
    registration_answers: [],
    attendance_answers: [],
    ...overrides,
  };
}

describe('ExportDashboardCheckInsButton', () => {
  let createObjectURLSpy: vi.Mock;
  let revokeObjectURLSpy: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = revokeObjectURLSpy;
  });

  it('renders Export CSV button', () => {
    render(
      <ExportDashboardCheckInsButton
        eventId="event-123"
        checkedInAttendees={[makeAttendee({})]}
        selectedFields={[]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
  });

  it('triggers CSV download on click', () => {
    const checkedIn = [makeAttendee({ nickname: 'John', last_name: 'Doe' })];

    render(
      <ExportDashboardCheckInsButton
        eventId="event-123"
        checkedInAttendees={checkedIn}
        selectedFields={[]}
      />,
    );

    const button = screen.getByRole('button', { name: 'Export CSV' });
    fireEvent.click(button);

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('respects disabled prop', () => {
    render(
      <ExportDashboardCheckInsButton
        eventId="event-123"
        checkedInAttendees={[makeAttendee({})]}
        selectedFields={[]}
        disabled={true}
      />,
    );

    const button = screen.getByRole('button', { name: 'Export CSV' });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });
});
