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
  wi_5th_sunday: 0,
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
          checked_in_at: '2026-01-04T00:45:00.000Z',
        },
        {
          id: null,
          service_date: '2026-01-11',
          time_slot: '12NN',
          is_walk_in: false,
          is_override: false,
          is_manual_entry: false,
          status: 'absent',
          checked_in_at: null,
        },
        {
          id: null,
          service_date: '2026-01-18',
          time_slot: '3PM',
          is_walk_in: false,
          is_override: false,
          is_manual_entry: false,
          status: 'excused',
          checked_in_at: null,
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

    // Check table headers for logins
    expect(screen.getByRole('columnheader', { name: 'Login Time' })).toBeInTheDocument();

    // Check log records
    expect(screen.getByText('2026-01-04')).toBeInTheDocument();
    expect(screen.getByText('1st Sunday')).toBeInTheDocument();
    expect(screen.getByText('9AM')).toBeInTheDocument();
    expect(screen.getByText('8:45 AM')).toBeInTheDocument();

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

  it('switches between detailed view and matrix view tabs and displays matrix rows correctly', () => {
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
          id: 'log-2',
          service_date: '2026-01-04',
          time_slot: '3PM',
          is_walk_in: true,
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
      />,
    );

    expect(screen.getByText(/LOGINS — 2 RECORDS/)).toBeInTheDocument();

    const matrixTab = screen.getByRole('tab', { name: /Matrix/i });
    fireEvent.click(matrixTab);

    // Matrix headers
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Week' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Attendance' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Committed' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Login Slots' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Absents' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Walk-In' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Excused' })).toBeInTheDocument();

    // Matrix rows content
    expect(screen.getAllByText('2026-01-04').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1st Sunday').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-01-11').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2nd Sunday').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-01-18').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3rd Sunday').length).toBeGreaterThan(0);

    // Check combined badge text
    expect(screen.getByText('9AM, 3PM')).toBeInTheDocument();

    // Scores (+1.5 for 1 present committed + 0.5 for 3PM walk-in; -1 for absent; -0.5 for excused)
    expect(screen.getByText('+1.5')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
    expect(screen.getByText('-0.5')).toBeInTheDocument();
  });

  it('renders matrix empty state when there are no logs', () => {
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

    const matrixTab = screen.getByRole('tab', { name: /Matrix/i });
    fireEvent.click(matrixTab);

    expect(screen.getByText('No attendance records found for this period.')).toBeInTheDocument();
  });

  it('scores 5th Sunday walk-in as +1.0 point regardless of slot', () => {
    (useVolunteerAttendanceLogQuery as Mock).mockReturnValue({
      data: [
        {
          id: 'log-5th',
          service_date: '2026-03-29', // 5th Sunday (day 29)
          time_slot: '12NN',
          status: 'present',
          is_walk_in: true,
          checked_in_at: '2026-03-29T12:05:00Z',
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

    const matrixTab = screen.getByRole('tab', { name: /Matrix/i });
    fireEvent.click(matrixTab);

    // 5th Sunday 12NN walk-in should score +1 instead of 0
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});
