import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { AdminMember } from '@/lib/domain/members';
import type { WeekCell } from '@/pages/admin/hub-calendar';
import type { MilestoneEntry } from '@/pages/admin/members/milestones';

import { MobileScheduleCalendar } from '../MobileScheduleCalendar';

vi.mock('@/components/ui', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
  Button: ({ children, onClick, ...props }: React.ComponentProps<'button'>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

const mockMember: AdminMember = {
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

describe('MobileScheduleCalendar', () => {
  it('renders week tabs and cells with schedules and milestones', () => {
    const onSelectWeek = vi.fn();
    const onSelectDay = vi.fn();

    const scheduleEntries: MemberScheduleEntry[] = [
      { member: mockMember, sundayKey: 'first_sunday', timeSlots: ['9AM'] },
      {
        member: { ...mockMember, id: 'm2', full_name: 'Jane' },
        sundayKey: 'first_sunday',
        timeSlots: ['9AM'],
      },
      {
        member: { ...mockMember, id: 'm3', full_name: 'Bob' },
        sundayKey: 'first_sunday',
        timeSlots: ['9AM'],
      },
      {
        member: { ...mockMember, id: 'm4', full_name: 'Alice' },
        sundayKey: 'first_sunday',
        timeSlots: ['9AM'],
      },
    ];

    const milestoneEntries: MilestoneEntry[] = [
      { id: 'ms1', type: 'birthday', member: mockMember },
      {
        id: 'ms2',
        type: 'wedding_anniversary',
        member: { ...mockMember, id: 'm2', full_name: 'Jane' },
      },
      { id: 'ms3', type: 'birthday', member: { ...mockMember, id: 'm3', full_name: 'Bob' } },
    ];

    const mobileWeekCells: WeekCell[] = [
      {
        date: new Date(2026, 4, 3),
        monthDayKey: '05-03',
        isSunday: true,
        sundayKey: 'first_sunday',
        scheduleEntries,
        milestoneEntries,
      },
      {
        date: new Date(2026, 4, 4),
        monthDayKey: '05-04',
        isSunday: false,
        sundayKey: null,
        scheduleEntries: [],
        milestoneEntries: [],
      },
      {
        date: new Date(2026, 4, 10),
        monthDayKey: '05-10',
        isSunday: true,
        sundayKey: 'second_sunday',
        scheduleEntries: [],
        milestoneEntries: [],
      },
    ];

    const weekOptions = [
      { weekNumber: 1, isAvailable: true },
      { weekNumber: 2, isAvailable: true },
    ];

    render(
      <MobileScheduleCalendar
        viewYear={2026}
        viewMonthIndex={4}
        selectedDayNumber={3}
        mobileWeekCells={mobileWeekCells}
        currentWeekNumber={1}
        weekOptions={weekOptions}
        onSelectWeek={onSelectWeek}
        onSelectDay={onSelectDay}
      />,
    );

    // Click week button
    const w2Btn = screen.getByLabelText('Go to week 2');
    fireEvent.click(w2Btn);
    expect(onSelectWeek).toHaveBeenCalledWith(2);

    // Click a day button
    const dayBtn = screen.getByText('May 3').closest('button')!;
    fireEvent.click(dayBtn);
    expect(onSelectDay).toHaveBeenCalledWith(3, expect.any(Date));

    // Verify badges and labels
    expect(screen.getByText('4 sched')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('No schedules')).toBeInTheDocument();
    expect(screen.getByText('No milestones')).toBeInTheDocument();
  });
});
