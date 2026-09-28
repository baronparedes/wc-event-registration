import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CommitmentDashboardStat } from '@/hooks/domain/services';

import { VolunteerListTable } from '../VolunteerListTable';

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name, avatarObjectKey }: { name: string; avatarObjectKey?: string | null }) => (
    <div data-testid="avatar" data-avatar-key={avatarObjectKey ?? ''}>
      {name}
    </div>
  ),
}));

describe('VolunteerListTable', () => {
  const mockStats: CommitmentDashboardStat[] = [
    {
      user_id: '1',
      member_id: 'MEM-001',
      avatar_object_key: 'avatars/alpha.jpg',
      full_name: 'Test Alpha',
      nickname: 'Test Ali',
      email: 'test.alpha@example.com',
      role: 'Usher',
      category: 'Women',
      start_date: '2024-01-01',
      committed: 10,
      attended: 8,
      absences: 2,
      excused: 0,
      wi_9am_3pm: 1,
      wi_12nn: 0,
      wi_5th_sunday: 0,
      attendance_score: 6.5,
    },
    {
      user_id: '2',
      member_id: 'MEM-002',
      avatar_object_key: null,
      full_name: 'Test Bravo',
      nickname: 'Test Bobby',
      email: 'test.bravo@example.com',
      role: 'Greeter',
      category: 'Men',
      start_date: '2024-02-01',
      committed: 8,
      attended: 8,
      absences: 0,
      excused: 0,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      wi_5th_sunday: 2,
      attendance_score: 8,
    },
    {
      user_id: '3',
      member_id: 'MEM-003',
      avatar_object_key: null,
      full_name: 'Test Charlie',
      nickname: 'Test Chuck',
      email: 'test.charlie@example.com',
      role: 'Media',
      category: 'Youth',
      start_date: '2024-03-01',
      committed: 12,
      attended: 5,
      absences: 6,
      excused: 1,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      wi_5th_sunday: 0,
      attendance_score: -1.5,
    },
  ];

  const defaultProps = {
    stats: mockStats,
    totalVolunteers: 3,
    searchQuery: '',
    onSearchChange: vi.fn(),
    selectedRoles: [],
    onSelectedRolesChange: vi.fn(),
    categoryFilter: 'All Categories',
    onCategoryFilterChange: vi.fn(),
    roles: ['Usher', 'Greeter', 'Media'],
    categories: ['Women', 'Men', 'Youth'],
    isLoading: false,
  };

  it('renders table headers and volunteer rows sorted by attendance score desc by default', () => {
    render(<VolunteerListTable {...defaultProps} />);

    const rows = screen.getAllByRole('row');
    // Row 0 is header, Row 1 is Bravo (score 8), Row 2 is Alpha (score 6.5), Row 3 is Charlie (score -1.5)
    expect(rows[1]).toHaveTextContent('Test Bravo');
    expect(rows[2]).toHaveTextContent('Test Alpha');
    expect(rows[3]).toHaveTextContent('Test Charlie');
  });

  it('sorts by volunteer name ascending and descending when volunteer header is clicked', () => {
    render(<VolunteerListTable {...defaultProps} />);

    const volunteerHeaderBtn = screen.getByRole('button', { name: /^volunteer$/i });
    fireEvent.click(volunteerHeaderBtn);

    const rows = screen.getAllByRole('row');
    // Ascending: Alpha -> Bravo -> Charlie
    expect(rows[1]).toHaveTextContent('Test Alpha');
    expect(rows[2]).toHaveTextContent('Test Bravo');
    expect(rows[3]).toHaveTextContent('Test Charlie');

    // Click again to sort descending: Charlie -> Bravo -> Alpha
    fireEvent.click(volunteerHeaderBtn);
    const descRows = screen.getAllByRole('row');
    expect(descRows[1]).toHaveTextContent('Test Charlie');
    expect(descRows[2]).toHaveTextContent('Test Bravo');
    expect(descRows[3]).toHaveTextContent('Test Alpha');
  });

  it('sorts by start date column', () => {
    render(<VolunteerListTable {...defaultProps} />);

    const startDateHeaderBtn = screen.getByRole('button', { name: /^start date$/i });
    fireEvent.click(startDateHeaderBtn);

    const rows = screen.getAllByRole('row');
    // Ascending by start date: Jan (Alpha) -> Feb (Bravo) -> Mar (Charlie)
    expect(rows[1]).toHaveTextContent('Test Alpha');
    expect(rows[2]).toHaveTextContent('Test Bravo');
    expect(rows[3]).toHaveTextContent('Test Charlie');
  });

  it('sorts numeric columns properly (committed, attended, absences, excused, walk-ins, attendance score)', () => {
    render(<VolunteerListTable {...defaultProps} />);

    // Committed: desc (Charlie: 12 -> Alpha: 10 -> Bravo: 8)
    const committedHeaderBtn = screen.getByRole('button', { name: /^committed$/i });
    fireEvent.click(committedHeaderBtn);
    let rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Test Charlie');
    expect(rows[2]).toHaveTextContent('Test Alpha');
    expect(rows[3]).toHaveTextContent('Test Bravo');

    // Attended: desc (Alpha: 8, Bravo: 8 -> Charlie: 5)
    const attendedHeaderBtn = screen.getByRole('button', { name: /^attended$/i });
    fireEvent.click(attendedHeaderBtn);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Test Alpha');
    expect(rows[2]).toHaveTextContent('Test Bravo');
    expect(rows[3]).toHaveTextContent('Test Charlie');

    // Absences: desc (Charlie: 6 -> Alpha: 2 -> Bravo: 0)
    const absencesHeaderBtn = screen.getByRole('button', { name: /^absences$/i });
    fireEvent.click(absencesHeaderBtn);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Test Charlie');
    expect(rows[2]).toHaveTextContent('Test Alpha');
    expect(rows[3]).toHaveTextContent('Test Bravo');

    // Excused: desc (Charlie: 1 -> Alpha: 0, Bravo: 0)
    const excusedHeaderBtn = screen.getByRole('button', { name: /^excused$/i });
    fireEvent.click(excusedHeaderBtn);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Test Charlie');

    // WI 9AM/3PM: desc (Alpha: 1 -> Bravo: 0, Charlie: 0)
    const wi9HeaderBtn = screen.getByRole('button', { name: /^wi 9am\/3pm$/i });
    fireEvent.click(wi9HeaderBtn);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Test Alpha');

    // WI 12NN
    const wi12HeaderBtn = screen.getByRole('button', { name: /^wi 12nn$/i });
    fireEvent.click(wi12HeaderBtn);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toBeDefined();

    // WI 5th Sun (Bravo: 2 -> Alpha: 0, Charlie: 0)
    const wi5thHeaderBtn = screen.getByRole('button', { name: /^wi 5th sun$/i });
    fireEvent.click(wi5thHeaderBtn);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Test Bravo');

    // Attendance score (switched to attendance_score -> defaults to desc: Bravo: 8 -> Alpha: 6.5 -> Charlie: -1.5)
    const attendanceHeaderBtn = screen.getByRole('button', { name: /^attendance$/i });
    fireEvent.click(attendanceHeaderBtn);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Test Bravo');
    expect(rows[2]).toHaveTextContent('Test Alpha');
    expect(rows[3]).toHaveTextContent('Test Charlie');

    // Clicking attendance score again toggles to asc (-1.5 -> 6.5 -> 8)
    fireEvent.click(attendanceHeaderBtn);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Test Charlie');
    expect(rows[2]).toHaveTextContent('Test Alpha');
    expect(rows[3]).toHaveTextContent('Test Bravo');
  });

  it('handles multi-role dropdown interactions (toggle, check, uncheck, clear, escape)', () => {
    const onSelectedRolesChange = vi.fn();
    render(
      <VolunteerListTable
        {...defaultProps}
        selectedRoles={['Usher']}
        onSelectedRolesChange={onSelectedRolesChange}
      />,
    );

    // Initial label with 1 selected in dropdown trigger
    expect(screen.getAllByText('Usher')[0]).toBeInTheDocument();

    // Open dropdown
    const dropdownTrigger = screen.getByLabelText('Filter by Role');
    fireEvent.click(dropdownTrigger);

    // Toggle a role (e.g. Greeter) -> adds to ['Usher', 'Greeter']
    const greeterCheckbox = screen.getByRole('checkbox', { name: /greeter/i });
    fireEvent.click(greeterCheckbox);
    expect(onSelectedRolesChange).toHaveBeenCalledWith(['Usher', 'Greeter']);

    // Toggle already selected role (Usher) -> removes to []
    const usherCheckbox = screen.getByRole('checkbox', { name: /usher/i });
    fireEvent.click(usherCheckbox);
    expect(onSelectedRolesChange).toHaveBeenCalledWith([]);

    // Click "All Roles" clear button
    const clearBtn = screen.getByRole('button', { name: 'All Roles' });
    fireEvent.click(clearBtn);
    expect(onSelectedRolesChange).toHaveBeenCalledWith([]);

    // Close on escape key
    fireEvent.keyDown(document, { key: 'Escape' });

    // Open again and test mousedown inside vs outside, and non-escape key
    fireEvent.click(dropdownTrigger);
    fireEvent.keyDown(document, { key: 'Tab' }); // non-escape shouldn't close
    expect(screen.getByRole('button', { name: 'All Roles' })).toBeInTheDocument();

    // Mouse down inside dropdown
    fireEvent.mouseDown(clearBtn);
    expect(screen.getByRole('button', { name: 'All Roles' })).toBeInTheDocument();

    // Mouse down outside dropdown
    fireEvent.mouseDown(document.body);
  });

  it('renders label for multiple selected roles', () => {
    render(<VolunteerListTable {...defaultProps} selectedRoles={['Usher', 'Greeter']} />);

    expect(screen.getByText('2 roles selected')).toBeInTheDocument();
  });

  it('renders label for 0 selected roles', () => {
    render(<VolunteerListTable {...defaultProps} selectedRoles={[]} />);

    expect(screen.getByText('All Roles')).toBeInTheDocument();
  });

  it('sorts text columns in ascending and toggles to descending', () => {
    render(<VolunteerListTable {...defaultProps} />);

    // Sort start date
    const startDateBtn = screen.getByRole('button', { name: /^start date$/i });
    fireEvent.click(startDateBtn); // asc: 2024-01-01 (Alpha) -> 2024-02-01 (Bravo) -> 2024-03-01 (Charlie)
    let rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Test Alpha');
    fireEvent.click(startDateBtn); // desc: 2024-03-01 (Charlie) -> 2024-02-01 (Bravo) -> 2024-01-01 (Alpha)
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Test Charlie');
  });

  it('handles volunteer rows with missing/null values for role, category, nickname, and start_date', () => {
    const sparseStats: CommitmentDashboardStat[] = [
      {
        user_id: '4',
        member_id: 'MEM-004',
        avatar_object_key: null,
        full_name: 'Test Delta',
        nickname: '',
        email: 'test.delta@example.com',
        role: '',
        category: '',
        start_date: '',
        committed: 0,
        attended: 0,
        absences: 0,
        excused: 0,
        wi_9am_3pm: 0,
        wi_12nn: 0,
        wi_5th_sunday: 0,
        attendance_score: 0,
      },
    ];

    render(<VolunteerListTable {...defaultProps} stats={sparseStats} totalVolunteers={1} />);

    expect(screen.getAllByText('Test Delta').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('passes avatar_object_key to Avatar component', () => {
    render(<VolunteerListTable {...defaultProps} />);

    const avatars = screen.getAllByTestId('avatar');
    // The first rendered row sorted by score is Bravo (null), then Alpha ('avatars/alpha.jpg'), then Charlie (null)
    const alphaAvatar = avatars.find((el) => el.textContent === 'Test Alpha');
    expect(alphaAvatar).toHaveAttribute('data-avatar-key', 'avatars/alpha.jpg');
  });

  it('triggers category filter change', () => {
    render(<VolunteerListTable {...defaultProps} />);

    const categoryBtn = screen.getByLabelText('Filter by Category');
    fireEvent.click(categoryBtn);

    const option = screen.getByRole('option', { name: 'Women' });
    fireEvent.click(option);

    expect(defaultProps.onCategoryFilterChange).toHaveBeenCalledWith('Women');
  });

  it('renders loading spinner when isLoading is true', () => {
    const { container } = render(<VolunteerListTable {...defaultProps} isLoading={true} />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
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
    fireEvent.change(searchInput, { target: { value: 'Test Alpha' } });

    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('Test Alpha');
  });
});
