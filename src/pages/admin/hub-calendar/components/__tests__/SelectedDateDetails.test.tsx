import { faker } from '@faker-js/faker';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import type { ExcusedMemberMap } from '@/lib/domain/hub-calendar';
import type { AdminMember } from '@/lib/domain/members';

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
    expect(screen.getAllByTitle('Excused')).toHaveLength(1);
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
    expect(screen.queryByTitle('Excused')).not.toBeInTheDocument();
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

    expect(screen.queryByTitle('Excused')).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Excused' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solid' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Moderate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'At Risk' })).toBeInTheDocument();

    // Role filters (second line)
    expect(screen.getByRole('button', { name: 'Usher' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Greeter' })).toBeInTheDocument();
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
    const excusedBtn = screen.getByRole('button', { name: 'Excused' });
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

    expect(screen.getByText(/Expected/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidence/i)).toBeInTheDocument();
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
    const solidBtn = screen.getByRole('button', { name: 'Solid' });
    fireEvent.click(solidBtn);

    // Only Solid member (m1, Usher) visible
    expect(screen.getByText(mockMember1.full_name)).toBeInTheDocument();
    expect(screen.queryByText(mockMember2.full_name)).not.toBeInTheDocument();

    // Click Greeter role on line 2
    const greeterBtn = screen.getByRole('button', { name: 'Greeter' });
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
});
