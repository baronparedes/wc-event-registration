import { faker } from '@faker-js/faker';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import type { ExcusedMemberMap } from '@/lib/domain/hub-calendar';
import type { AdminMember, MemberAttendanceStats } from '@/lib/domain/members';

import { SelectedDateDetails } from '../SelectedDateDetails';

vi.mock('@/hooks/domain/members', () => ({
  useMemberAvatarQuery: vi.fn(() => ({ data: null })),
}));

const firstName1 = faker.person.firstName();
const lastName1 = faker.person.lastName();
const firstName2 = faker.person.firstName();
const lastName2 = faker.person.lastName();

const mockMember1: AdminMember = {
  id: 'm1',
  member_id: 'MEM-001',
  avatar_object_key: null,
  is_active: true,
  first_name: firstName1,
  last_name: lastName1,
  nickname: faker.person.firstName(),
  full_name: `${firstName1} ${lastName1}`,
  email: faker.internet.exampleEmail({ firstName: firstName1, lastName: lastName1 }),
  phone: '123-456',
  date_of_birth: '1990-05-15',
  role: 'Usher',
  category: 'adult',
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
  extra_metadata: {},
};

const mockMember2: AdminMember = {
  id: 'm2',
  member_id: 'MEM-002',
  avatar_object_key: null,
  is_active: true,
  first_name: firstName2,
  last_name: lastName2,
  nickname: faker.person.firstName(),
  full_name: `${firstName2} ${lastName2}`,
  email: faker.internet.exampleEmail({ firstName: firstName2, lastName: lastName2 }),
  phone: '654-321',
  date_of_birth: '1992-08-20',
  role: 'Greeter',
  category: 'adult',
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
  extra_metadata: {},
};

const entry1: MemberScheduleEntry = {
  member: mockMember1,
  sundayKey: 'third_sunday',
  timeSlots: ['9AM', '12NN'],
};

const entry2: MemberScheduleEntry = {
  member: mockMember2,
  sundayKey: 'third_sunday',
  timeSlots: ['9AM'],
};

const entriesByTimeSlot: Record<TimeSlot, MemberScheduleEntry[]> = {
  '9AM': [entry1, entry2],
  '12NN': [entry1],
  '3PM': [],
};

describe('SelectedDateDetails', () => {
  it('correctly tags excused status only for the active service tab matching excused slots', () => {
    // Member 1 is only excused for 9AM on 2026-09-20
    // Member 2 is not excused
    const excusedMap: ExcusedMemberMap = new Map([
      ['2026-09-20', new Map([['mem-001', new Set<TimeSlot>(['9AM'])]])],
    ]);

    const { rerender } = render(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8} // September
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[entry1, entry2]}
          entriesByTimeSlot={entriesByTimeSlot}
          isCurrentSelectedSunday={true}
          excusedMap={excusedMap}
          activeTab="9AM"
          selectedRole={null}
          searchQuery=""
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    // On 9AM tab: member 1 (entry1) is excused; member 2 (entry2) is not excused
    expect(
      screen.getByTitle('Excused: Submitted an approved excuse request for this service slot.'),
    ).toBeInTheDocument();
    expect(screen.getByText(mockMember1.full_name)).toBeInTheDocument();

    // Rerender with activeTab="12NN" where member 1 is scheduled but NOT excused for 12NN
    rerender(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[entry1, entry2]}
          entriesByTimeSlot={entriesByTimeSlot}
          isCurrentSelectedSunday={true}
          excusedMap={excusedMap}
          activeTab="12NN"
          selectedRole={null}
          searchQuery=""
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Member 1 is present in 12NN but should NOT be marked excused!
    expect(
      screen.queryByTitle('Excused: Submitted an approved excuse request for this service slot.'),
    ).not.toBeInTheDocument();
    expect(screen.getByText(mockMember1.full_name)).toBeInTheDocument();
  });

  it('does not tag as excused if excused record date is for another year or month', () => {
    // Excused record for 2025-09-20 instead of 2026-09-20
    const excusedMap: ExcusedMemberMap = new Map([
      ['2025-09-20', new Map([['mem-001', new Set<TimeSlot>(['9AM'])]])],
    ]);

    render(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[entry1]}
          entriesByTimeSlot={entriesByTimeSlot}
          isCurrentSelectedSunday={true}
          excusedMap={excusedMap}
          activeTab="9AM"
          selectedRole={null}
          searchQuery=""
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.queryByTitle('Excused: Submitted an approved excuse request for this service slot.'),
    ).not.toBeInTheDocument();
  });

  it('renders status/confidence pill filters on first line and role filters on second line', () => {
    const excusedMap: ExcusedMemberMap = new Map([
      ['2026-09-20', new Map([['mem-001', new Set<TimeSlot>(['9AM'])]])],
    ]);

    render(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[entry1, entry2]}
          entriesByTimeSlot={entriesByTimeSlot}
          isCurrentSelectedSunday={true}
          excusedMap={excusedMap}
          activeTab="9AM"
          selectedRole={null}
          searchQuery=""
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Status/Confidence filters (first line)
    expect(screen.getByRole('tab', { name: /Excused/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Solid/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Moderate/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /At Risk/i })).toBeInTheDocument();

    // Role filters (second line)
    expect(screen.getByRole('tab', { name: 'Usher' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Greeter' })).toBeInTheDocument();
  });

  it('filters member list by Excused status when clicking Excused pill on first line', () => {
    const excusedMap: ExcusedMemberMap = new Map([
      ['2026-09-20', new Map([['mem-001', new Set<TimeSlot>(['9AM'])]])],
    ]);

    render(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[entry1, entry2]}
          entriesByTimeSlot={entriesByTimeSlot}
          isCurrentSelectedSunday={true}
          excusedMap={excusedMap}
          activeTab="9AM"
          selectedRole={null}
          searchQuery=""
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Both members initially visible
    expect(screen.getByText(mockMember1.full_name)).toBeInTheDocument();
    expect(screen.getByText(mockMember2.full_name)).toBeInTheDocument();

    // Click Excused pill on line 1
    const excusedBtn = screen.getByRole('tab', { name: /Excused/i });
    fireEvent.click(excusedBtn);

    // Only excused member 1 should be visible
    expect(screen.getByText(mockMember1.full_name)).toBeInTheDocument();
    expect(screen.queryByText(mockMember2.full_name)).not.toBeInTheDocument();
  });

  it('renders slot confidence forecast banner on scheduled Sunday', () => {
    const statsMap = new Map([
      ['m1', { attendanceScore: 10, committed: 10, attended: 10, turnupRate: 1.0 }],
      ['m2', { attendanceScore: -2, committed: 10, attended: 2, turnupRate: 0.2 }],
    ]);

    render(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[entry1, entry2]}
          entriesByTimeSlot={entriesByTimeSlot}
          isCurrentSelectedSunday={true}
          attendanceScoreMap={statsMap}
          activeTab="9AM"
          selectedRole={null}
          searchQuery=""
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Realistic Expected Turnup:/i)).toBeInTheDocument();
    expect(screen.getByText(/confidence/i)).toBeInTheDocument();
    expect(screen.getByText('Volunteer Staffing Forecast')).toBeInTheDocument();
  });

  it('combines confidence tier filter from first line and role filter from second line', () => {
    const statsMap = new Map([
      ['m1', { attendanceScore: 10, committed: 10, attended: 10, turnupRate: 1.0 }], // Solid, Usher
      ['m2', { attendanceScore: -2, committed: 10, attended: 2, turnupRate: 0.2 }], // At Risk, Greeter
    ]);
    const handleRoleChange = vi.fn();

    const { rerender } = render(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[entry1, entry2]}
          entriesByTimeSlot={entriesByTimeSlot}
          isCurrentSelectedSunday={true}
          attendanceScoreMap={statsMap}
          activeTab="9AM"
          selectedRole={null}
          searchQuery=""
          onTabChange={vi.fn()}
          onRoleChange={handleRoleChange}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Both members initially visible
    expect(screen.getByText(mockMember1.full_name)).toBeInTheDocument();
    expect(screen.getByText(mockMember2.full_name)).toBeInTheDocument();

    // Click Solid filter pill on line 1
    const solidBtn = screen.getByRole('tab', { name: /Solid/i });
    fireEvent.click(solidBtn);

    // Only Solid member (m1, Usher) visible
    expect(screen.getByText(mockMember1.full_name)).toBeInTheDocument();
    expect(screen.queryByText(mockMember2.full_name)).not.toBeInTheDocument();

    // Click Greeter role on line 2
    const greeterBtn = screen.getByRole('tab', { name: 'Greeter' });
    fireEvent.click(greeterBtn);
    expect(handleRoleChange).toHaveBeenCalledWith('Greeter');

    // Rerender with selectedRole="Greeter" while Solid is active -> no matches (m1 is Usher, m2 is At Risk)
    rerender(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[entry1, entry2]}
          entriesByTimeSlot={entriesByTimeSlot}
          isCurrentSelectedSunday={true}
          attendanceScoreMap={statsMap}
          activeTab="9AM"
          selectedRole="Greeter"
          searchQuery=""
          onTabChange={vi.fn()}
          onRoleChange={handleRoleChange}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No solid volunteers found for role "Greeter"/i)).toBeInTheDocument();
    expect(screen.queryByText(mockMember1.full_name)).not.toBeInTheDocument();
    expect(screen.queryByText(mockMember2.full_name)).not.toBeInTheDocument();
  });

  it('renders Share Schedule button on scheduled Sunday and opens dialog when clicked', () => {
    render(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[entry1, entry2]}
          entriesByTimeSlot={entriesByTimeSlot}
          isCurrentSelectedSunday={true}
          activeTab="9AM"
          selectedRole={null}
          searchQuery=""
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    const shareButton = screen.getByRole('button', { name: /Share Schedule/i });
    expect(shareButton).toBeInTheDocument();

    fireEvent.click(shareButton);
    expect(screen.getByRole('heading', { name: 'Share Sunday Schedule' })).toBeInTheDocument();
  });

  it('renders and supports clicking the All Sunday slot tab', () => {
    const handleTabChange = vi.fn();
    render(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[entry1, entry2]}
          entriesByTimeSlot={entriesByTimeSlot}
          isCurrentSelectedSunday={true}
          activeTab="ALL"
          selectedRole={null}
          searchQuery=""
          onTabChange={handleTabChange}
          onRoleChange={vi.fn()}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    const allSundayBtn = screen.getByRole('button', { name: /All Sunday/i });
    expect(allSundayBtn).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /9:00 AM/i }));
    expect(handleTabChange).toHaveBeenCalledWith('9AM');

    // Both entry1 and entry2 are visible in ALL tab
    expect(screen.getByText(mockMember1.full_name)).toBeInTheDocument();
    expect(screen.getByText(mockMember2.full_name)).toBeInTheDocument();
  });

  it('renders Inactive badge on member with 0 attendance data joined > 30 days ago', () => {
    const oldMember: typeof mockMember1 = {
      ...mockMember1,
      id: 'old-mem',
      first_name: 'Test One',
      last_name: 'Sample Member',
      full_name: 'Test One Sample Member',
      created_at: '2023-01-01T00:00:00Z',
    };
    const oldEntry: MemberScheduleEntry = {
      member: oldMember,
      sundayKey: 'first_sunday',
      timeSlots: ['9AM'],
    };

    render(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[oldEntry]}
          entriesByTimeSlot={{ '9AM': [oldEntry], '12NN': [], '3PM': [] }}
          isCurrentSelectedSunday={true}
          activeTab="9AM"
          selectedRole={null}
          searchQuery=""
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Test One Sample Member')).toBeInTheDocument();
    expect(screen.getAllByText('Inactive').length).toBeGreaterThanOrEqual(2);
  });

  it('renders Inactive badge on member with 0% turnout (attended 0 commitments)', () => {
    const zeroTurnoutMember: typeof mockMember1 = {
      ...mockMember1,
      id: 'zero-mem',
      first_name: 'Test Zero',
      last_name: 'Sample Turnout',
      full_name: 'Test Zero Sample Turnout',
      created_at: '2023-01-01T00:00:00Z',
    };
    const zeroEntry: MemberScheduleEntry = {
      member: zeroTurnoutMember,
      sundayKey: 'first_sunday',
      timeSlots: ['9AM'],
    };
    const zeroStatsMap = new Map<string, MemberAttendanceStats>([
      ['zero-mem', { attendanceScore: -5, committed: 5, attended: 0, turnupRate: 0 }],
    ]);

    render(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[zeroEntry]}
          entriesByTimeSlot={{ '9AM': [zeroEntry], '12NN': [], '3PM': [] }}
          isCurrentSelectedSunday={true}
          activeTab="9AM"
          selectedRole={null}
          searchQuery=""
          attendanceScoreMap={zeroStatsMap}
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Test Zero Sample Turnout')).toBeInTheDocument();
    expect(screen.getAllByText('Inactive').length).toBeGreaterThanOrEqual(2);
  });

  it('separates At Risk and Inactive when filtering by tier tab', () => {
    const atRiskMember: typeof mockMember1 = {
      ...mockMember1,
      id: 'risk-mem',
      first_name: 'Test Risk',
      last_name: 'Sample User',
      full_name: 'Test Risk Sample User',
      created_at: '2023-01-01T00:00:00Z',
    };
    const inactiveMember: typeof mockMember2 = {
      ...mockMember2,
      id: 'inact-mem',
      first_name: 'Test Inact',
      last_name: 'Sample User',
      full_name: 'Test Inact Sample User',
      created_at: '2023-01-01T00:00:00Z',
    };
    const riskEntry: MemberScheduleEntry = {
      member: atRiskMember,
      sundayKey: 'first_sunday',
      timeSlots: ['9AM'],
    };
    const inactEntry: MemberScheduleEntry = {
      member: inactiveMember,
      sundayKey: 'first_sunday',
      timeSlots: ['9AM'],
    };
    const statsMap = new Map<string, MemberAttendanceStats>([
      ['risk-mem', { attendanceScore: -2, committed: 10, attended: 2, turnupRate: 0.2 }], // At Risk (>0 attended)
      ['inact-mem', { attendanceScore: -5, committed: 5, attended: 0, turnupRate: 0 }], // Inactive (0 attended)
    ]);

    render(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[riskEntry, inactEntry]}
          entriesByTimeSlot={{ '9AM': [riskEntry, inactEntry], '12NN': [], '3PM': [] }}
          isCurrentSelectedSunday={true}
          activeTab="9AM"
          selectedRole={null}
          searchQuery=""
          attendanceScoreMap={statsMap}
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Both visible initially
    expect(screen.getByText('Test Risk Sample User')).toBeInTheDocument();
    expect(screen.getByText('Test Inact Sample User')).toBeInTheDocument();

    // Click Inactive tab
    const inactTab = screen.getByRole('tab', { name: /Inactive/i });
    fireEvent.click(inactTab);

    // Only Inactive member visible
    expect(screen.queryByText('Test Risk Sample User')).not.toBeInTheDocument();
    expect(screen.getByText('Test Inact Sample User')).toBeInTheDocument();

    // Click At Risk tab
    const atRiskTab = screen.getByRole('tab', { name: /At Risk/i });
    fireEvent.click(atRiskTab);

    // Only At Risk member visible
    expect(screen.getByText('Test Risk Sample User')).toBeInTheDocument();
    expect(screen.queryByText('Test Inact Sample User')).not.toBeInTheDocument();
  });

  it('displays the filtered results count and provides a clear filters button when filtered', () => {
    const handleRoleChange = vi.fn();
    const handleSearchChange = vi.fn();

    render(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[entry1, entry2]}
          entriesByTimeSlot={entriesByTimeSlot}
          isCurrentSelectedSunday={true}
          activeTab="9AM"
          selectedRole="Usher"
          searchQuery=""
          onTabChange={vi.fn()}
          onRoleChange={handleRoleChange}
          onSearchQueryChange={handleSearchChange}
        />
      </MemoryRouter>,
    );

    // Should show filtered count from total
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByText(/filtered from 2/i)).toBeInTheDocument();

    // Click Clear filters
    const clearBtn = screen.getByRole('button', { name: /Clear filters/i });
    fireEvent.click(clearBtn);

    expect(handleRoleChange).toHaveBeenCalledWith(null);
    expect(handleSearchChange).toHaveBeenCalledWith('');
  });

  it('opens MemberQuickViewDialog when a member card is clicked', () => {
    render(
      <MemoryRouter>
        <SelectedDateDetails
          viewYear={2026}
          viewMonthIndex={8}
          selectedDayNumber={20}
          selectedMilestones={[]}
          selectedEntries={[entry1]}
          entriesByTimeSlot={entriesByTimeSlot}
          isCurrentSelectedSunday={true}
          activeTab="9AM"
          selectedRole={null}
          searchQuery=""
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
          onSearchQueryChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Dialog should not be open initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Click on member card
    const memberCard = screen.getByText(mockMember1.full_name);
    fireEvent.click(memberCard);

    // Dialog should now be open
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Dialog should contain "Member Details" and a button to view full profile
    expect(screen.getByText('Member Details')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Full Profile' })).toBeInTheDocument();
  });
});
