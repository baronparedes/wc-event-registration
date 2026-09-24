import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CommitmentDashboardStat } from '@/hooks/domain/services';

import { CommitmentSummaryCards } from '../CommitmentSummaryCards';

describe('CommitmentSummaryCards', () => {
  const mockStats: CommitmentDashboardStat[] = [
    {
      user_id: '1',
      member_id: 'MEM-001',
      full_name: 'Alice',
      nickname: 'Ali',
      email: 'alice@example.com',
      role: 'Usher',
      category: 'Women',
      start_date: '2025-01-01',
      committed: 10,
      attended: 8,
      absences: 2,
      excused: 1,
      wi_9am_3pm: 2,
      wi_12nn: 1,
      attendance_score: 6.5,
    },
    {
      user_id: '2',
      member_id: 'MEM-002',
      full_name: 'Bob',
      nickname: 'Bobby',
      email: 'bob@example.com',
      role: 'Greeter',
      category: 'Men',
      start_date: '2025-02-01',
      committed: 0,
      attended: 0,
      absences: 0,
      excused: 0,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      attendance_score: 0,
    },
  ];

  it('computes and renders summary metrics correctly', () => {
    render(<CommitmentSummaryCards stats={mockStats} totalVolunteers={2} />);

    expect(screen.getByText('Volunteers')).toBeInTheDocument();
    expect(screen.getAllByText('2')).toHaveLength(2); // 2 volunteers and 2 absences
    expect(screen.getByText('1 with activity')).toBeInTheDocument();

    expect(screen.getByText('Attended')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();

    expect(screen.getByText('Absences')).toBeInTheDocument();

    expect(screen.getByText('Excused')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    expect(screen.getByText('Walk-ins')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // wi_9am_3pm (2) + wi_12nn (1)

    expect(screen.getByText('Avg Attendance')).toBeInTheDocument();
    expect(screen.getByText('8.0')).toBeInTheDocument();
  });

  it('handles empty stats gracefully with 0.0 avg attendance', () => {
    render(<CommitmentSummaryCards stats={[]} totalVolunteers={0} />);

    expect(screen.getByText('0 with activity')).toBeInTheDocument();
    expect(screen.getByText('0.0')).toBeInTheDocument();
  });
});
