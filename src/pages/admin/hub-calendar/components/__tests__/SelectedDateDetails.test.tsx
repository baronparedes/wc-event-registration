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

const mockMember1: AdminMember = {
  id: 'm1',
  member_id: 'MEM-001',
  avatar_object_key: null,
  is_active: true,
  first_name: 'John',
  last_name: 'Doe',
  nickname: 'Johnny',
  full_name: 'John Doe',
  email: 'john@example.com',
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
  first_name: 'Jane',
  last_name: 'Smith',
  nickname: 'Janey',
  full_name: 'Jane Smith',
  email: 'jane@example.com',
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
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    // On 9AM tab: John Doe (entry1) is excused; Jane Smith (entry2) is not excused
    expect(screen.getAllByTitle('Excused')).toHaveLength(1);
    expect(screen.getByText('John Doe')).toBeInTheDocument();

    // Rerender with activeTab="12NN" where John Doe is scheduled but NOT excused for 12NN
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
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    // John Doe is present in 12NN but should NOT be marked excused!
    expect(screen.queryByTitle('Excused')).not.toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
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
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByTitle('Excused')).not.toBeInTheDocument();
  });

  it('renders Excused button right after All and calls onRoleChange on click', () => {
    const excusedMap: ExcusedMemberMap = new Map([
      ['2026-09-20', new Map([['mem-001', new Set<TimeSlot>(['9AM'])]])],
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
          excusedMap={excusedMap}
          activeTab="9AM"
          selectedRole={null}
          onTabChange={vi.fn()}
          onRoleChange={handleRoleChange}
        />
      </MemoryRouter>,
    );

    const buttons = screen.getAllByRole('button');
    const allBtnIndex = buttons.findIndex((btn) => btn.textContent === 'All');
    expect(allBtnIndex).toBeGreaterThanOrEqual(0);
    expect(buttons[allBtnIndex + 1].textContent).toBe('Excused');

    // Click Excused button
    fireEvent.click(buttons[allBtnIndex + 1]);
    expect(handleRoleChange).toHaveBeenCalledWith('Excused');

    // Rerender with selectedRole="Excused"
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
          activeTab="9AM"
          selectedRole="Excused"
          onTabChange={vi.fn()}
          onRoleChange={handleRoleChange}
        />
      </MemoryRouter>,
    );

    // Clicking Excused again should toggle back to null
    const excusedBtn = screen.getByRole('button', { name: 'Excused' });
    fireEvent.click(excusedBtn);
    expect(handleRoleChange).toHaveBeenCalledWith(null);

    // Only excused member (John Doe) should be visible
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('displays empty message when Excused filter is active and no members are excused', () => {
    // No excused members in map
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
          excusedMap={new Map()}
          activeTab="9AM"
          selectedRole="Excused"
          onTabChange={vi.fn()}
          onRoleChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('No excused members for this service.')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });
});
