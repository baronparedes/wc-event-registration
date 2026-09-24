import { render, screen } from '@testing-library/react';
import { type Mock, describe, expect, it, vi } from 'vitest';

import { useVolunteerAttendanceLogQuery } from '@/hooks/domain/services';

import { VolunteerAttendanceModal } from '../VolunteerAttendanceModal';

vi.mock('@/hooks/domain/services', () => ({
  useVolunteerAttendanceLogQuery: vi.fn(),
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
  it('renders correctly with data', () => {
    (useVolunteerAttendanceLogQuery as Mock).mockReturnValue({
      data: [
        {
          id: 'log-1',
          service_date: '2026-01-04',
          time_slot: '9AM',
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

    expect(screen.getByText('Herminio Fajardo')).toBeInTheDocument();
    expect(screen.getByText('(Hermie)')).toBeInTheDocument();
    expect(screen.getByText('YTD · Year to Date')).toBeInTheDocument();

    // Check for stats
    expect(screen.getAllByText('84').length).toBeGreaterThan(0);

    // Check table headers
    expect(screen.getByText('DATE')).toBeInTheDocument();
    expect(screen.getByText('WEEK')).toBeInTheDocument();
    expect(screen.getByText('TIME SLOT')).toBeInTheDocument();

    // Check log data
    expect(screen.getByText('2026-01-04')).toBeInTheDocument();
    expect(screen.getByText('1st Sunday')).toBeInTheDocument();
    expect(screen.getByText('9AM')).toBeInTheDocument();
  });
});
