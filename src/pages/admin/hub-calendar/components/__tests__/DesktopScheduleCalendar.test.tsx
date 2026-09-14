import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { CalendarCell, MilestoneEntry } from '@/lib/domain/hub-calendar';
import type { AdminMember } from '@/lib/domain/members';

import { DesktopScheduleCalendar } from '../DesktopScheduleCalendar';

vi.mock('@/components/ui', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
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

describe('DesktopScheduleCalendar', () => {
  it('renders blank cells, sundays with schedules, and days with milestones', () => {
    const onSelectDay = vi.fn();
    const calendarCells: CalendarCell[] = [
      {
        dayNumber: null,
        monthDayKey: null,
        isCurrentMonth: false,
        isSunday: false,
        sundayKey: null,
      },
      {
        dayNumber: 1,
        monthDayKey: '05-01',
        isCurrentMonth: true,
        isSunday: false,
        sundayKey: null,
      },
      {
        dayNumber: 3,
        monthDayKey: '05-03',
        isCurrentMonth: true,
        isSunday: true,
        sundayKey: 'first_sunday',
      },
      {
        dayNumber: 10,
        monthDayKey: '05-10',
        isCurrentMonth: true,
        isSunday: true,
        sundayKey: 'second_sunday',
      },
    ];

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
      {
        member: { ...mockMember, id: 'm5', full_name: 'Charlie' },
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

    const scheduleMap = new Map<string, MemberScheduleEntry[]>([
      ['05-03', scheduleEntries],
      ['05-10', []],
    ]);

    const milestoneMap = new Map<string, MilestoneEntry[]>([
      ['05-01', milestoneEntries],
      ['05-03', [milestoneEntries[0], milestoneEntries[1], milestoneEntries[2]]],
    ]);

    render(
      <DesktopScheduleCalendar
        calendarCells={calendarCells}
        scheduleMap={scheduleMap}
        milestoneMap={milestoneMap}
        selectedDayNumber={3}
        onSelectDay={onSelectDay}
      />,
    );

    // Verify day selection callback
    const dayButtons = screen.getAllByRole('button');
    fireEvent.click(dayButtons[0]);
    expect(onSelectDay).toHaveBeenCalledWith(1);

    // Verify empty Sunday message
    expect(screen.getByText('No schedules')).toBeInTheDocument();

    // Verify schedule badge
    expect(screen.getByText('5 sched')).toBeInTheDocument();

    // Verify combined excess overflow (+3)
    expect(screen.getByText('+3')).toBeInTheDocument();
  });
});
