import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CommitmentDashboardStat } from '@/hooks/domain/services';

import { VolunteerListTable } from '../VolunteerListTable';

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}));

describe('VolunteerListTable', () => {
  const mockStats: CommitmentDashboardStat[] = [
    {
      user_id: '1',
      member_id: 'MEM-001',
      full_name: 'Alice Smith',
      nickname: 'Ali',
      email: 'alice@example.com',
      role: 'Usher',
      category: 'Women',
      start_date: '2024-01-01',
      committed: 10,
      attended: 8,
      absences: 2,
      excused: 0,
      wi_9am_3pm: 1,
      wi_12nn: 0,
      attendance_score: 6.5,
    },
    {
      user_id: '2',
      member_id: 'MEM-002',
      full_name: 'Bob Jones',
      nickname: 'Bobby',
      email: 'bob@example.com',
      role: 'Greeter',
      category: 'Men',
      start_date: '2024-02-01',
      committed: 8,
      attended: 8,
      absences: 0,
      excused: 0,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      attendance_score: 8,
    },
    {
      user_id: '3',
      member_id: 'MEM-003',
      full_name: 'Charlie Brown',
      nickname: 'Chuck',
      email: 'charlie@example.com',
      role: 'Media',
      category: 'Youth',
      start_date: '2024-03-01',
      committed: 12,
      attended: 5,
      absences: 6,
      excused: 1,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      attendance_score: -1.5,
    },
  ];

  const defaultProps = {
    stats: mockStats,
    totalVolunteers: 3,
    searchQuery: '',
    onSearchChange: vi.fn(),
    roleFilter: 'All Roles',
    onRoleFilterChange: vi.fn(),
    categoryFilter: 'All Categories',
    onCategoryFilterChange: vi.fn(),
    roles: ['Usher', 'Greeter', 'Media'],
    categories: ['Women', 'Men', 'Youth'],
    isLoading: false,
  };

  it('renders table headers and volunteer rows sorted by attendance score desc by default', () => {
    render(<VolunteerListTable {...defaultProps} />);

    const rows = screen.getAllByRole('row');
    // Row 0 is header, Row 1 is Bob (score 8), Row 2 is Alice (score 6.5), Row 3 is Charlie (score -1.5)
    expect(rows[1]).toHaveTextContent('Bob Jones');
    expect(rows[2]).toHaveTextContent('Alice Smith');
    expect(rows[3]).toHaveTextContent('Charlie Brown');
  });

  it('sorts by volunteer name ascending when volunteer header is clicked', () => {
    render(<VolunteerListTable {...defaultProps} />);

    const volunteerHeaderBtn = screen.getByRole('button', { name: /volunteer/i });
    fireEvent.click(volunteerHeaderBtn);

    const rows = screen.getAllByRole('row');
    // Ascending: Alice -> Bob -> Charlie
    expect(rows[1]).toHaveTextContent('Alice Smith');
    expect(rows[2]).toHaveTextContent('Bob Jones');
    expect(rows[3]).toHaveTextContent('Charlie Brown');

    // Click again to sort descending: Charlie -> Bob -> Alice
    fireEvent.click(volunteerHeaderBtn);
    const descRows = screen.getAllByRole('row');
    expect(descRows[1]).toHaveTextContent('Charlie Brown');
    expect(descRows[2]).toHaveTextContent('Bob Jones');
    expect(descRows[3]).toHaveTextContent('Alice Smith');
  });

  it('sorts numeric columns properly (e.g. committed)', () => {
    render(<VolunteerListTable {...defaultProps} />);

    const committedHeaderBtn = screen.getByRole('button', { name: /committed/i });
    fireEvent.click(committedHeaderBtn);

    const rows = screen.getAllByRole('row');
    // First click on numeric: desc (Charlie: 12 -> Alice: 10 -> Bob: 8)
    expect(rows[1]).toHaveTextContent('Charlie Brown');
    expect(rows[2]).toHaveTextContent('Alice Smith');
    expect(rows[3]).toHaveTextContent('Bob Jones');
  });

  it('renders empty state when no volunteers are found', () => {
    render(<VolunteerListTable {...defaultProps} stats={[]} totalVolunteers={0} />);

    expect(screen.getByText('No volunteers found')).toBeInTheDocument();
    expect(
      screen.getByText('No volunteers matched your search criteria or filters.'),
    ).toBeInTheDocument();
  });

  it('triggers search input change callback', () => {
    render(<VolunteerListTable {...defaultProps} />);

    const searchInput = screen.getByLabelText('Search name or nickname');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('Alice');
  });
});
