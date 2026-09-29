import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { AdminMember } from '@/lib/domain/members';

import { useHubCalendarData } from '../hooks/useHubCalendarData';

const mockUseGetExcusedMembers = vi.fn();

vi.mock('@/hooks/domain/members', () => ({
  useGetExcusedMembers: (...args: unknown[]) => mockUseGetExcusedMembers(...args),
}));

describe('useHubCalendarData', () => {
  it('combines excused slots by member and ignores dates outside the viewed month', () => {
    mockUseGetExcusedMembers.mockReturnValue({
      data: [
        { memberId: ' MEM-001 ', userId: 'USER-001', requestDate: '', services: '9AM' },
        { memberId: 'MEM-001', userId: 'USER-001', requestDate: '2026-04-01', services: '9AM' },
        {
          memberId: ' MEM-001 ',
          userId: 'USER-001',
          requestDate: '2026-03-01T00:00:00Z',
          services: '9AM',
          reason: 'Test absence',
        },
        {
          memberId: 'MEM-001',
          userId: 'USER-001',
          requestDate: '2026-03-01',
          services: '12NN',
          reason: 'Test appointment',
        },
      ],
    });

    const { result } = renderHook(() => useHubCalendarData([], [], 2026, 2, 1));

    expect(mockUseGetExcusedMembers).toHaveBeenCalledWith(2026, 2);
    expect([...result.current.excusedMap.keys()]).toEqual(['2026-03-01']);
    const excuses = result.current.excusedMap.get('2026-03-01');
    expect(excuses?.get('mem-001')).toEqual({
      slots: new Set(['9AM', '12NN']),
      reasons: new Map([
        ['9AM', 'Test absence'],
        ['12NN', 'Test appointment'],
      ]),
    });
    expect(excuses?.get('user-001')).toEqual(excuses?.get('mem-001'));
    expect(result.current.isCurrentSelectedSunday).toBe(true);
    expect(result.current.selectedEntries).toEqual([]);
  });

  it('groups selected Sunday schedules and milestones into time slots', () => {
    mockUseGetExcusedMembers.mockReturnValue({ data: [] });
    const member: AdminMember = {
      id: 'user-1',
      member_id: 'MEM-001',
      avatar_object_key: null,
      is_active: true,
      full_name: 'Test Calendar Member',
      first_name: 'Test Calendar',
      last_name: 'Test Member',
      nickname: null,
      email: null,
      phone: null,
      date_of_birth: '1990-03-01',
      role: 'Usher',
      category: 'adult',
      extra_metadata: { wedanniv_date: '2015-03-01' },
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    const schedule: MemberScheduleEntry = {
      member,
      sundayKey: 'first_sunday',
      timeSlots: ['9AM', '3PM'],
    };

    const { result, rerender } = renderHook(
      ({ day }) => useHubCalendarData([schedule], [member], 2026, 2, day),
      { initialProps: { day: 1 } },
    );

    expect(result.current.selectedEntries).toEqual([schedule]);
    expect(result.current.entriesByTimeSlot).toEqual({
      '9AM': [schedule],
      '12NN': [],
      '3PM': [schedule],
    });
    expect(result.current.birthdayCount).toBe(1);
    expect(result.current.anniversaryCount).toBe(1);
    expect(result.current.selectedMilestones).toHaveLength(2);
    expect(result.current.mobileWeekCells.length).toBeGreaterThan(0);

    rerender({ day: 2 });
    expect(result.current.selectedEntries).toEqual([]);
    expect(result.current.selectedMilestones).toEqual([]);
    expect(result.current.isCurrentSelectedSunday).toBe(false);
  });
});
