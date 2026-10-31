import { describe, expect, it } from 'vitest';

import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import type { AdminMember, MemberAttendanceStats } from '@/lib/domain/members';

import {
  findStandInCandidates,
  formatRecommendationReasoning,
  getSundayKeyForDate,
} from '../standIn';
import type { ExcusedMemberMap } from '../types';

function createMockMember(id: string, role: string, overrides?: Partial<AdminMember>): AdminMember {
  return {
    id,
    member_id: `MEM-${id}`,
    full_name: `Test Volunteer ${id}`,
    first_name: 'Test Volunteer',
    last_name: `Test ${id}`,
    nickname: null,
    role,
    is_active: true,
    email: `test-${id}@example.com`,
    phone: '09171234567',
    avatar_object_key: null,
    date_of_birth: '1990-01-01',
    category: 'adult',
    extra_metadata: {},
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    notes: [],
    ...overrides,
  };
}

describe('getSundayKeyForDate', () => {
  it('identifies the correct SundayKey for Sundays in a month', () => {
    // Nov 2026:
    // Nov 1: 1st Sunday -> first_sunday
    // Nov 8: 2nd Sunday -> second_sunday
    // Nov 15: 3rd Sunday -> third_sunday
    // Nov 22: 4th Sunday -> fourth_sunday
    // Nov 29: 5th Sunday -> fifth_sunday
    expect(getSundayKeyForDate('2026-11-01')).toBe('first_sunday');
    expect(getSundayKeyForDate('2026-11-08')).toBe('second_sunday');
    expect(getSundayKeyForDate('2026-11-15')).toBe('third_sunday');
    expect(getSundayKeyForDate('2026-11-22')).toBe('fourth_sunday');
    expect(getSundayKeyForDate('2026-11-29')).toBe('fifth_sunday');
  });

  it('supports Date instances as input', () => {
    expect(getSundayKeyForDate(new Date('2026-11-01T12:00:00Z'))).toBe('first_sunday');
  });

  it('returns null for non-Sunday dates', () => {
    expect(getSundayKeyForDate('2026-11-02')).toBeNull(); // Monday
    expect(getSundayKeyForDate('2026-11-07')).toBeNull(); // Saturday
  });
});

describe('findStandInCandidates', () => {
  const members: AdminMember[] = [
    createMockMember('1', 'Prayer Coach'),
    createMockMember('2', 'Prayer Coach'),
    createMockMember('3', 'Prayer Coach'),
    createMockMember('4', 'Prayer Coach'),
    createMockMember('5', 'Usher'), // Different role
    createMockMember('6', 'Prayer Coach', { is_active: false }), // Inactive
  ];

  const scheduleEntries: MemberScheduleEntry[] = [
    {
      member: members[0], // member 1 is already scheduled for 9AM on first_sunday
      sundayKey: 'first_sunday',
      timeSlots: ['9AM'],
    },
    {
      member: members[1], // member 2 serves 12NN on first_sunday, but usually serves 9AM on second_sunday
      sundayKey: 'second_sunday',
      timeSlots: ['9AM'],
    },
  ];

  const attendanceScoreMap = new Map<string, MemberAttendanceStats>([
    ['1', { attendanceScore: 10, turnupRate: 95, committed: 10, attended: 9 }],
    ['2', { attendanceScore: 9, turnupRate: 90, committed: 10, attended: 9 }],
    ['3', { attendanceScore: 8, turnupRate: 85, committed: 10, attended: 8 }],
    ['4', { attendanceScore: 3, turnupRate: 60, committed: 10, attended: 6 }], // Moderate tier
  ]);

  it('filters candidates by role, slot availability, and active status', () => {
    const result = findStandInCandidates({
      targetRole: 'Prayer Coach',
      targetDate: '2026-11-01', // first_sunday
      targetSlot: '9AM',
      allMembers: members,
      scheduleEntries,
      attendanceScoreMap,
    });

    // Member 1 is excluded (already committed to 9AM on first_sunday)
    // Member 5 is excluded (Usher, not Prayer Coach)
    // Member 6 is excluded (inactive)
    // Members 2, 3, and 4 qualify
    expect(result.candidates.length).toBe(3);

    // Tokens assigned
    expect(result.candidates[0].token).toBe('USR_001');
    expect(result.candidates[1].token).toBe('USR_002');
    expect(result.candidates[2].token).toBe('USR_003');

    // Token mapping points back to actual members
    expect(result.tokenToMemberMap.get('USR_001')?.id).toBe('2');
    expect(result.tokenToMemberMap.get('USR_002')?.id).toBe('3');
    expect(result.tokenToMemberMap.get('USR_003')?.id).toBe('4');
  });

  it('excludes the excused member when excludeMemberId is specified', () => {
    const result = findStandInCandidates({
      targetRole: 'Prayer Coach',
      targetDate: '2026-11-01',
      targetSlot: '9AM',
      allMembers: members,
      scheduleEntries,
      attendanceScoreMap,
      excludeMemberId: '2',
    });

    const candidateIds = Array.from(result.tokenToMemberMap.values()).map((m) => m.id);
    expect(candidateIds).not.toContain('2');
    expect(candidateIds).toContain('3');
  });

  it('excludes candidates with approved excuse for the target date and slot', () => {
    const excusedMap: ExcusedMemberMap = new Map([
      ['2026-11-01', new Map([['3', new Set<TimeSlot>(['9AM'])]])],
    ]);

    const result = findStandInCandidates({
      targetRole: 'Prayer Coach',
      targetDate: '2026-11-01',
      targetSlot: '9AM',
      allMembers: members,
      scheduleEntries,
      excusedMap,
      attendanceScoreMap,
    });

    const candidateIds = Array.from(result.tokenToMemberMap.values()).map((m) => m.id);
    expect(candidateIds).not.toContain('3');
  });

  it('correctly handles decimal turnup rates (0.0 - 1.0) and matches compound roles', () => {
    const compoundMembers: AdminMember[] = [
      createMockMember('10', 'Prayer Coach / Usher'),
      createMockMember('11', 'Backroom Support / PC'),
      createMockMember('12', 'Usher'),
    ];

    const decimalStatsMap = new Map<string, MemberAttendanceStats>([
      ['10', { attendanceScore: 8.5, turnupRate: 0.9, committed: 10, attended: 9 }],
      ['11', { attendanceScore: 5.0, turnupRate: 0.75, committed: 10, attended: 8 }],
      ['12', { attendanceScore: 9.0, turnupRate: 0.95, committed: 10, attended: 10 }],
    ]);

    const result = findStandInCandidates({
      targetRole: 'Prayer Coach',
      targetDate: '2026-11-01',
      targetSlot: '9AM',
      allMembers: compoundMembers,
      scheduleEntries: [],
      attendanceScoreMap: decimalStatsMap,
    });

    // Members 10 and 11 match Prayer Coach via compound role
    expect(result.candidates.length).toBe(2);
    expect(result.candidates[0].turnupRate).toBe(90);
    expect(result.candidates[1].turnupRate).toBe(75);
    expect(result.candidates[0].tier).toBe('solid');
    expect(result.candidates[1].tier).toBe('solid');
  });

  it('combines solid and moderate candidates to fill up to maxCandidates when requested', () => {
    const candidateMembers: AdminMember[] = [
      createMockMember('1', 'Usher'),
      createMockMember('2', 'Usher'),
      createMockMember('3', 'Usher'),
      createMockMember('4', 'Usher'),
      createMockMember('5', 'Usher'),
    ];

    const statsMap = new Map<string, MemberAttendanceStats>([
      ['1', { attendanceScore: 10, turnupRate: 90, committed: 10, attended: 9 }], // solid
      ['2', { attendanceScore: 9, turnupRate: 85, committed: 10, attended: 9 }], // solid
      ['3', { attendanceScore: 3, turnupRate: 50, committed: 10, attended: 5 }], // moderate
      ['4', { attendanceScore: 2, turnupRate: 45, committed: 10, attended: 5 }], // moderate
      ['5', { attendanceScore: 1, turnupRate: 40, committed: 10, attended: 4 }], // moderate
    ]);

    const result = findStandInCandidates({
      targetRole: 'Usher',
      targetDate: '2026-11-01',
      targetSlot: '9AM',
      allMembers: candidateMembers,
      scheduleEntries: [],
      attendanceScoreMap: statsMap,
      maxCandidates: 4,
    });

    expect(result.candidates.length).toBe(4);
    expect(result.candidates[0].token).toBe('USR_001');
    expect(result.candidates[0].tier).toBe('solid');
    expect(result.candidates[1].tier).toBe('solid');
    expect(result.candidates[2].tier).toBe('moderate');
    expect(result.candidates[3].tier).toBe('moderate');
  });

  it('slices only solid candidates when solid candidates meet or exceed maxCandidates', () => {
    const candidateMembers: AdminMember[] = [
      createMockMember('1', 'Usher'),
      createMockMember('2', 'Usher'),
      createMockMember('3', 'Usher'),
    ];

    const statsMap = new Map<string, MemberAttendanceStats>([
      ['1', { attendanceScore: 10, turnupRate: 90, committed: 10, attended: 9 }], // solid
      ['2', { attendanceScore: 9, turnupRate: 85, committed: 10, attended: 9 }], // solid
      ['3', { attendanceScore: 8, turnupRate: 80, committed: 10, attended: 8 }], // solid
    ]);

    const result = findStandInCandidates({
      targetRole: 'Usher',
      targetDate: '2026-11-01',
      targetSlot: '9AM',
      allMembers: candidateMembers,
      scheduleEntries: [],
      attendanceScoreMap: statsMap,
      maxCandidates: 2,
    });

    expect(result.candidates.length).toBe(2);
    expect(result.candidates[0].token).toBe('USR_001');
    expect(result.candidates[1].token).toBe('USR_002');
  });

  it('sorts candidates with identical turnupRate by attendanceScore descending', () => {
    const candidateMembers: AdminMember[] = [
      createMockMember('1', 'Usher'),
      createMockMember('2', 'Usher'),
    ];

    const statsMap = new Map<string, MemberAttendanceStats>([
      ['1', { attendanceScore: 7.0, turnupRate: 80, committed: 10, attended: 8 }],
      ['2', { attendanceScore: 9.5, turnupRate: 80, committed: 10, attended: 8 }],
    ]);

    const result = findStandInCandidates({
      targetRole: 'Usher',
      targetDate: '2026-11-01',
      targetSlot: '9AM',
      allMembers: candidateMembers,
      scheduleEntries: [],
      attendanceScoreMap: statsMap,
    });

    expect(result.candidates.length).toBe(2);
    expect(result.tokenToMemberMap.get('USR_001')?.id).toBe('2'); // score 9.5 comes first
    expect(result.tokenToMemberMap.get('USR_002')?.id).toBe('1'); // score 7.0 comes second
  });

  it('categorizes turnup between 30% and 40% as moderate tier and skips < 30%', () => {
    const candidateMembers: AdminMember[] = [
      createMockMember('1', 'Usher'), // 35% turnup -> moderate
      createMockMember('2', 'Usher'), // 25% turnup -> skipped (< 30%)
      createMockMember('3', 'Usher', { role: undefined }), // undefined role -> skipped
    ];

    const statsMap = new Map<string, MemberAttendanceStats>([
      ['1', { attendanceScore: 2.0, turnupRate: 35, committed: 10, attended: 3 }],
      ['2', { attendanceScore: 1.0, turnupRate: 25, committed: 10, attended: 2 }],
    ]);

    const result = findStandInCandidates({
      targetRole: 'Usher',
      targetDate: '2026-11-01',
      targetSlot: '9AM',
      allMembers: candidateMembers,
      scheduleEntries: [],
      attendanceScoreMap: statsMap,
    });

    expect(result.candidates.length).toBe(1);
    expect(result.candidates[0].token).toBe('USR_001');
    expect(result.candidates[0].tier).toBe('moderate');
  });

  it('uses default turnup rate and score when member is not in stats map', () => {
    const candidateMembers: AdminMember[] = [createMockMember('1', 'Usher')];

    const result = findStandInCandidates({
      targetRole: 'Usher',
      targetDate: '2026-11-01',
      targetSlot: '9AM',
      allMembers: candidateMembers,
      scheduleEntries: [],
    });

    expect(result.candidates.length).toBe(1);
    expect(result.candidates[0].attendanceScore).toBe(5);
  });

  describe('formatRecommendationReasoning', () => {
    const candidate1 = createMockMember('1', 'Prayer Coach', {
      first_name: 'Test Grace',
      full_name: 'Test Grace Sample',
      nickname: 'Test Grace',
    });
    const excusedMember = createMockMember('99', 'Prayer Coach', {
      first_name: 'Test Patrick',
      full_name: 'Test Patrick Sample',
      nickname: 'Test Pat',
    });
    const tokenToMemberMap = new Map<string, AdminMember>([['USR_001', candidate1]]);

    it('resolves candidate tokens to volunteer name', () => {
      const output = formatRecommendationReasoning({
        reasoning: 'USR_001 has solid reliability tier, 100% turnup and 9AM slot affinity.',
        candidateMember: candidate1,
        tokenToMemberMap,
      });

      expect(output).toBe(
        'Test Grace has solid reliability tier, 100% turnup and 9AM slot affinity.',
      );
      expect(output).not.toContain('USR_001');
    });

    it('resolves excused member tokens to excused volunteer name', () => {
      const output = formatRecommendationReasoning({
        reasoning: 'Excellent substitute for MEM_99 with strong 100% turnup.',
        candidateMember: candidate1,
        tokenToMemberMap,
        excusedMember,
        excusedMemberToken: 'MEM_99',
      });

      expect(output).toBe('Excellent substitute for Test Pat with strong 100% turnup.');
      expect(output).not.toContain('MEM_99');
    });

    it('strips stray unmapped candidate or member tokens gracefully', () => {
      const output = formatRecommendationReasoning({
        reasoning: 'USR_999 is ready for 9AM service.',
        candidateMember: candidate1,
        tokenToMemberMap: new Map(),
      });

      expect(output).toBe('Test Grace is ready for 9AM service.');
    });

    it('falls back to "the regular volunteer" when excusedMember is not provided', () => {
      const output = formatRecommendationReasoning({
        reasoning: 'Ready to substitute for MEM_EXCUSED.',
        candidateMember: candidate1,
        tokenToMemberMap,
        excusedMemberToken: 'MEM_EXCUSED',
      });

      expect(output).toBe('Ready to substitute for the regular volunteer.');
    });

    it('falls back to first_name or full_name when member has no nickname', () => {
      const candidateNoNick = createMockMember('2', 'Prayer Coach', {
        first_name: 'Test Grace',
        nickname: null,
      });
      const excusedNoNick = createMockMember('98', 'Prayer Coach', {
        first_name: null,
        full_name: 'Test Patrick Sample',
        nickname: null,
      });

      const output = formatRecommendationReasoning({
        reasoning: ': Candidate USR_002 will substitute for MEM_98 with strong turnup.',
        candidateMember: candidateNoNick,
        tokenToMemberMap: new Map([['USR_002', candidateNoNick]]),
        excusedMember: excusedNoNick,
      });

      expect(output).toBe('Test Grace will substitute for Test Patrick Sample with strong turnup.');
    });

    it('handles empty reasoning string without errors', () => {
      const output = formatRecommendationReasoning({
        reasoning: '',
        candidateMember: candidate1,
        tokenToMemberMap,
      });

      expect(output).toBe('');
    });
  });
});
