import { fireEvent, render, screen } from '@testing-library/react';
import { type Mock, describe, expect, it, vi } from 'vitest';

import { useVolunteerAttendanceLogQuery } from '@/hooks/domain/services';

import { VolunteerAttendanceModal } from '../VolunteerAttendanceModal';

vi.mock('@/hooks/domain/services', () => ({
  useVolunteerAttendanceLogQuery: vi.fn(),
}));

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name, avatarObjectKey }: { name: string; avatarObjectKey?: string | null }) => (
    <div data-testid="avatar" data-avatar-key={avatarObjectKey ?? ''}>
      {name}
    </div>
  ),
}));

const mockVolunteer = {
  user_id: 'user-1',
  member_id: 'member-1',
  avatar_object_key: null,
  full_name: 'Herminio Fajardo',
  nickname: 'Hermie',
  email: 'hermie@example.com',
  role: 'Prayer Coach / Backroom',
  category: 'Ministry',
  start_date: '2025-04-08',
  committed: 84,
  attended: 84,
  absences: 0,
  excused: 0,
  wi_9am_3pm: 0,
  wi_12nn: 0,
  attendance_score: 84,
};

describe('VolunteerAttendanceModal', () => {
  it('renders correctly with logins, absences, and excused logs', () => {
    (useVolunteerAttendanceLogQuery as Mock).mockReturnValue({
      data: [
        {
          id: 'log-1',
          service_date: '2026-01-04',
          time_slot: '9AM',
          is_walk_in: false,
          is_override: false,
          is_manual_entry: false,
          status: 'present',
        },
        {
          id: null,
          service_date: '2026-01-11',
          time_slot: '12NN',
          is_walk_in: false,
          is_override: false,
          is_manual_entry: false,
          status: 'absent',
        },
        {
          id: null,
          service_date: '2026-01-18',
          time_slot: '3PM',
          is_walk_in: false,
          is_override: false,
          is_manual_entry: false,
          status: 'excused',
        },
      ],
      isLoading: false,
    });

    render(
      <VolunteerAttendanceModal
        isOpen={true}
        onClose={vi.fn()}
        volunteer={mockVolunteer}
        timeframe="YTD"
        startDate="2026-01-01"
        endDate="2026-12-31"
        excuseEventId="excuse-event-1"
      />,
    );

    expect(screen.getByRole('heading', { name: /Herminio Fajardo/i })).toBeInTheDocument();
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(screen.getByText('(Hermie)')).toBeInTheDocument();
    expect(screen.getByText('YTD · Year to Date')).toBeInTheDocument();

    // Check section headers
    expect(screen.getByText(/LOGINS — 1 RECORDS/)).toBeInTheDocument();
    expect(screen.getByText(/ABSENCES — 1 RECORDS/)).toBeInTheDocument();
    expect(screen.getByText(/EXCUSED — 1 RECORDS/)).toBeInTheDocument();

    // Check log records
    expect(screen.getByText('2026-01-04')).toBeInTheDocument();
    expect(screen.getByText('1st Sunday')).toBeInTheDocument();
    expect(screen.getByText('9AM')).toBeInTheDocument();

    expect(screen.getByText('2026-01-11')).toBeInTheDocument();
    expect(screen.getByText('2nd Sunday')).toBeInTheDocument();
    expect(screen.getByText('12NN')).toBeInTheDocument();

    expect(screen.getByText('2026-01-18')).toBeInTheDocument();
    expect(screen.getByText('3rd Sunday')).toBeInTheDocument();
    expect(screen.getByText('3PM')).toBeInTheDocument();
  });

  it('renders empty states when no logins or absences are present', () => {
    (useVolunteerAttendanceLogQuery as Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(
      <VolunteerAttendanceModal
        isOpen={true}
        onClose={vi.fn()}
        volunteer={mockVolunteer}
        timeframe="YTD"
        startDate="2026-01-01"
        endDate="2026-12-31"
      />,
    );

    expect(screen.getByText(/LOGINS — 0 RECORDS/)).toBeInTheDocument();
    expect(screen.getByText(/ABSENCES — 0 RECORDS/)).toBeInTheDocument();
    expect(screen.getByText('No attendance records found for this period.')).toBeInTheDocument();
    expect(screen.getByText('No absences recorded for this period.')).toBeInTheDocument();
    expect(screen.queryByText(/EXCUSED —/)).not.toBeInTheDocument();
  });

  it('allows collapsing and expanding sections via CollapsibleSectionCard', () => {
    (useVolunteerAttendanceLogQuery as Mock).mockReturnValue({
      data: [
        {
          id: 'log-1',
          service_date: '2026-01-04',
          time_slot: '9AM',
          is_walk_in: false,
          is_override: false,
          is_manual_entry: false,
          status: 'present',
        },
      ],
      isLoading: false,
    });

    render(
      <VolunteerAttendanceModal
        isOpen={true}
        onClose={vi.fn()}
        volunteer={mockVolunteer}
        timeframe="YTD"
        startDate="2026-01-01"
        endDate="2026-12-31"
      />,
    );

    expect(screen.getByText('2026-01-04')).toBeInTheDocument();

    const collapseButtons = screen.getAllByRole('button', { name: 'Collapse section' });
    expect(collapseButtons[0]).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(collapseButtons[0]);
    expect(collapseButtons[0]).toHaveAttribute('aria-expanded', 'false');
  });

  it('switches between detailed view and matrix view tabs', () => {
    (useVolunteerAttendanceLogQuery as Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(
      <VolunteerAttendanceModal
        isOpen={true}
        onClose={vi.fn()}
        volunteer={mockVolunteer}
        timeframe="YTD"
        startDate="2026-01-01"
        endDate="2026-12-31"
      />,
    );

    expect(screen.getByText(/LOGINS — 0 RECORDS/)).toBeInTheDocument();

    const matrixTab = screen.getByRole('tab', { name: /Matrix/i });
    fireEvent.click(matrixTab);

    expect(screen.getByText('Matrix view is coming soon.')).toBeInTheDocument();
    expect(screen.queryByText(/LOGINS — 0 RECORDS/)).not.toBeInTheDocument();
  });
});
