import { beforeEach, describe, expect, it } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { ExcusedMemberMap } from '@/lib/domain/hub-calendar';
import type { AdminMember, MemberAttendanceStats } from '@/lib/domain/members';
import {
  DEFAULT_VOLUNTEER_ROLE_TARGETS,
  DEFAULT_VOLUNTEER_TARGETS_BY_SLOT,
  HUB_CALENDAR_STAFFING_TARGETS_STORAGE_KEY,
  calculateAllSundayStaffingNeeds,
  calculateSlotStaffingNeeds,
  getStoredVolunteerTargets,
  normalizeStaffingRole,
  saveStoredVolunteerTargets,
} from '@/pages/admin/hub-calendar/utils/volunteerStaffingUtils';

function createMockMember(id: string, name: string, role: string): AdminMember {
  return {
    id,
    member_id: `MEM-${id}`,
    avatar_object_key: null,
    is_active: true,
    first_name: name,
    last_name: 'Test',
    nickname: name,
    full_name: `${name} Test`,
    email: `${name.toLowerCase()}@test.com`,
    phone: null,
    date_of_birth: '1990-01-01',
    role,
    category: 'adult',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    extra_metadata: {},
  };
}

function createScheduleEntry(member: AdminMember, timeSlots = ['9AM']): MemberScheduleEntry {
  return {
    member,
    sundayKey: 'first_sunday',
    timeSlots: timeSlots as ('9AM' | '12NN' | '3PM')[],
  };
}

describe('volunteerStaffingUtils', () => {
  describe('normalizeStaffingRole', () => {
    it('normalizes various role formats correctly', () => {
      expect(normalizeStaffingRole('Usher')).toBe('Usher');
      expect(normalizeStaffingRole('ushering')).toBe('Usher');
      expect(normalizeStaffingRole('Backroom')).toBe('Backroom Support');
      expect(normalizeStaffingRole('Backroom Support')).toBe('Backroom Support');
      expect(normalizeStaffingRole('Backroom Support / PC')).toBe('Backroom Support');
      expect(normalizeStaffingRole('Prayer Coach')).toBe('Prayer Coach');
      expect(normalizeStaffingRole('PC')).toBe('Prayer Coach');
      expect(normalizeStaffingRole('Prayer Coach / Backroom')).toBe('Prayer Coach');
      expect(normalizeStaffingRole('IMT Support')).toBe('IMT Support');
      expect(normalizeStaffingRole('IMT')).toBe('IMT Support');
      expect(normalizeStaffingRole('VMT Support')).toBe('VMT Support');
      expect(normalizeStaffingRole('VMT')).toBe('VMT Support');
      expect(normalizeStaffingRole('OIC')).toBe('OIC');
      expect(normalizeStaffingRole('Special Role')).toBe('Special Role');
      expect(normalizeStaffingRole('')).toBe('General Volunteer');
      expect(normalizeStaffingRole(null)).toBe('General Volunteer');
    });
  });

  describe('Storage helpers', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('returns default targets by slot when nothing is stored', () => {
      expect(getStoredVolunteerTargets()).toEqual(DEFAULT_VOLUNTEER_TARGETS_BY_SLOT);
    });

    it('saves and retrieves customized per-slot targets', () => {
      const customTargets = {
        '9AM': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS, Usher: 30 },
        '12NN': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS, Usher: 20 },
        '3PM': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS, Usher: 15 },
      };
      saveStoredVolunteerTargets(customTargets);
      expect(getStoredVolunteerTargets()).toEqual(customTargets);
    });

    it('migrates legacy flat targets format to all slots', () => {
      localStorage.setItem(
        HUB_CALENDAR_STAFFING_TARGETS_STORAGE_KEY,
        JSON.stringify({ Usher: 40, 'Backroom Support': 12 }),
      );
      const retrieved = getStoredVolunteerTargets();
      expect(retrieved['9AM'].Usher).toBe(40);
      expect(retrieved['12NN'].Usher).toBe(40);
      expect(retrieved['3PM'].Usher).toBe(40);
      expect(retrieved['9AM']['Backroom Support']).toBe(12);
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem(HUB_CALENDAR_STAFFING_TARGETS_STORAGE_KEY, 'invalid json');
      expect(getStoredVolunteerTargets()).toEqual(DEFAULT_VOLUNTEER_TARGETS_BY_SLOT);
    });
  });

  describe('calculateSlotStaffingNeeds', () => {
    it('calculates full deficit when no members are scheduled', () => {
      const forecast = calculateSlotStaffingNeeds([], undefined, '2026-10-04', '9AM');
      expect(forecast.totalTarget).toBe(91); // 25 + 10 + 50 + 4 + 2
      expect(forecast.totalCommitted).toBe(0);
      expect(forecast.totalExpectedTurnup).toBe(0);
      expect(forecast.totalNeeded).toBe(91);
      expect(forecast.overallFulfillmentPercentage).toBe(0);

      const usher = forecast.roleBreakdown.find((r) => r.role === 'Usher');
      expect(usher).toBeDefined();
      expect(usher?.target).toBe(25);
      expect(usher?.expectedTurnup).toBe(0);
      expect(usher?.needed).toBe(25);
    });

    it('calculates expected turnup with attendance probabilities and deficits', () => {
      const m1 = createMockMember('1', 'Alice', 'Usher'); // Solid 1.0
      const m2 = createMockMember('2', 'Bob', 'Usher'); // Moderate 0.6
      const m3 = createMockMember('3', 'Charlie', 'Backroom Support'); // 0.8 default
      const m4 = createMockMember('4', 'Dave', 'Prayer Coach'); // At Risk 0.3
      const m5 = createMockMember('5', 'Eve', 'Prayer Coach'); // Excused

      const entries = [
        createScheduleEntry(m1),
        createScheduleEntry(m2),
        createScheduleEntry(m3),
        createScheduleEntry(m4),
        createScheduleEntry(m5),
      ];

      const statsMap = new Map<string, MemberAttendanceStats>([
        ['1', { attendanceScore: 10, committed: 10, attended: 10, turnupRate: 1.0 }],
        ['2', { attendanceScore: 5, committed: 10, attended: 6, turnupRate: 0.6 }],
        ['4', { attendanceScore: -3, committed: 10, attended: 3, turnupRate: 0.3 }],
      ]);

      const excusedMap: ExcusedMemberMap = new Map([
        ['2026-10-04', new Map([['5', { slots: new Set(['9AM']) }]])],
      ]);

      const forecast = calculateSlotStaffingNeeds(
        entries,
        excusedMap,
        '2026-10-04',
        '9AM',
        DEFAULT_VOLUNTEER_ROLE_TARGETS,
        statsMap,
      );

      // Total committed non-excused = 4, excused = 1
      expect(forecast.totalCommitted).toBe(4);
      expect(forecast.totalExcused).toBe(1);

      // Ushers: 1.0 + 0.6 = 1.6 -> round(2). Target 25 -> needed 23.
      const usher = forecast.roleBreakdown.find((r) => r.role === 'Usher')!;
      expect(usher.committed).toBe(2);
      expect(usher.expectedTurnup).toBe(2);
      expect(usher.needed).toBe(23);

      // Backroom: 0.8 -> round(1). Target 10 -> needed 9.
      const backroom = forecast.roleBreakdown.find((r) => r.role === 'Backroom Support')!;
      expect(backroom.committed).toBe(1);
      expect(backroom.expectedTurnup).toBe(1);
      expect(backroom.needed).toBe(9);

      // Prayer Coach: m4 = 0.3, m5 excused. Probability = 0.3 -> round(0). Target 50 -> needed 50.
      const pc = forecast.roleBreakdown.find((r) => r.role === 'Prayer Coach')!;
      expect(pc.committed).toBe(1);
      expect(pc.excused).toBe(1);
      expect(pc.expectedTurnup).toBe(0);
      expect(pc.needed).toBe(50);
    });

    it('correctly handles surplus when expected turnup exceeds target', () => {
      const customTargets = {
        'VMT Support': 1,
      };

      const m1 = createMockMember('1', 'VMT1', 'VMT Support');
      const m2 = createMockMember('2', 'VMT2', 'VMT Support');
      const entries = [createScheduleEntry(m1), createScheduleEntry(m2)];

      const forecast = calculateSlotStaffingNeeds(
        entries,
        undefined,
        '2026-10-04',
        '9AM',
        customTargets,
      );

      const vmt = forecast.roleBreakdown.find((r) => r.role === 'VMT Support')!;
      // Default rate 0.8 each -> 1.6 -> round(2). Target 1 -> needed 0, surplus 1.
      expect(vmt.expectedTurnup).toBe(2);
      expect(vmt.needed).toBe(0);
      expect(vmt.surplus).toBe(1);
      expect(vmt.fulfillmentPercentage).toBe(100);
    });
  });

  describe('calculateAllSundayStaffingNeeds', () => {
    it('aggregates different per-slot targets across Sunday', () => {
      const m1 = createMockMember('1', 'Usher1', 'Usher');
      const m2 = createMockMember('2', 'Usher2', 'Usher');

      const entriesBySlot = {
        '9AM': [createScheduleEntry(m1, ['9AM'])],
        '12NN': [createScheduleEntry(m2, ['12NN'])],
        '3PM': [],
      };

      const perSlotTargets = {
        '9AM': { Usher: 10, 'Backroom Support': 5 },
        '12NN': { Usher: 15, 'Backroom Support': 6 },
        '3PM': { Usher: 20, 'Backroom Support': 7 },
      };

      const forecast = calculateAllSundayStaffingNeeds(
        entriesBySlot,
        undefined,
        '2026-10-04',
        perSlotTargets,
      );

      expect(forecast.slot).toBe('ALL');
      // Target across 3 slots: Usher = 10 + 15 + 20 = 45; Backroom = 5 + 6 + 7 = 18. Total = 63.
      expect(forecast.totalTarget).toBe(63);
      expect(forecast.totalCommitted).toBe(2);
      expect(forecast.roleBreakdown.find((r) => r.role === 'Usher')?.target).toBe(45);
      expect(forecast.roleBreakdown.find((r) => r.role === 'Backroom Support')?.target).toBe(18);
    });
  });
});
