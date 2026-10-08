import { describe, expect, it } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { ExcusedMemberMap } from '@/lib/domain/hub-calendar';
import type { AdminMember, MemberAttendanceStats } from '@/lib/domain/members';
import {
  calculateAllSundayConfidenceForecast,
  calculateSlotConfidenceForecast,
  getConfidenceTierLabel,
  getMemberConfidenceTier,
  getMemberConfidenceTooltip,
  isMemberInactiveWithoutAttendance,
} from '@/pages/admin/hub-calendar/utils';

function createMockMember(id: string, name: string): AdminMember {
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
    role: 'Usher',
    category: 'adult',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    extra_metadata: {},
  };
}

function createScheduleEntry(member: AdminMember): MemberScheduleEntry {
  return {
    member,
    sundayKey: 'first_sunday',
    timeSlots: ['9AM'],
  };
}

describe('calculateSlotConfidenceForecast', () => {
  it('returns zeroes when entries array is empty', () => {
    const result = calculateSlotConfidenceForecast([], undefined, '2026-10-04', '9AM');
    expect(result).toEqual({
      totalCommitted: 0,
      expectedTurnup: 0,
      confidencePercentage: 0,
      highCount: 0,
      moderateCount: 0,
      atRiskCount: 0,
      inactiveCount: 0,
      excusedCount: 0,
    });
  });

  it('calculates expected turnup and buckets correctly with mixed turnup rates', () => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() - 5);
    const m1 = createMockMember('m1', 'Solid');
    const m2 = createMockMember('m2', 'Moderate');
    const m3 = createMockMember('m3', 'AtRisk');
    const m4 = { ...createMockMember('m4', 'NewMember'), created_at: newDate.toISOString() };
    const m5 = { ...createMockMember('m5', 'InactiveMember'), created_at: '2020-01-01' };

    const entries = [
      createScheduleEntry(m1),
      createScheduleEntry(m2),
      createScheduleEntry(m3),
      createScheduleEntry(m4),
      createScheduleEntry(m5),
    ];

    const statsMap = new Map<string, MemberAttendanceStats>([
      ['m1', { attendanceScore: 10, committed: 10, attended: 10, turnupRate: 1.0 }], // Solid (>=0.7)
      ['m2', { attendanceScore: 3, committed: 10, attended: 6, turnupRate: 0.6 }], // Moderate (0.4-0.69)
      ['m3', { attendanceScore: -2, committed: 10, attended: 2, turnupRate: 0.2 }], // At risk (<0.4 with >0 turnout)
      // m4 has no historical stats but is a new member -> defaults to 0.8 (Solid)
      ['m5', { attendanceScore: -5, committed: 5, attended: 0, turnupRate: 0 }], // Inactive (0% turnout)
    ]);

    const result = calculateSlotConfidenceForecast(
      entries,
      undefined,
      '2026-10-04',
      '9AM',
      statsMap,
    );

    // Sum of probabilities = 1.0 + 0.6 + 0.2 + 0.8 + 0 = 2.6 -> rounds to 3
    expect(result.totalCommitted).toBe(5);
    expect(result.expectedTurnup).toBe(3);
    // Confidence % = (2.6 / 5) * 100 = 52%
    expect(result.confidencePercentage).toBe(52);
    expect(result.highCount).toBe(2); // m1 and m4
    expect(result.moderateCount).toBe(1); // m2
    expect(result.atRiskCount).toBe(1); // m3
    expect(result.inactiveCount).toBe(1); // m5
    expect(result.excusedCount).toBe(0);
  });

  it('handles excused volunteers by excluding them from expected turnup and adding to excusedCount', () => {
    const m1 = createMockMember('m1', 'ExcusedMember');
    const m2 = createMockMember('m2', 'ActiveMember');

    const entries = [createScheduleEntry(m1), createScheduleEntry(m2)];

    const excusedMap: ExcusedMemberMap = new Map([
      ['2026-10-04', new Map([['mem-m1', new Set(['9AM'])]])],
    ]);

    const statsMap = new Map<string, MemberAttendanceStats>([
      ['m1', { attendanceScore: 10, committed: 10, attended: 10, turnupRate: 1.0 }],
      ['m2', { attendanceScore: 10, committed: 10, attended: 10, turnupRate: 1.0 }],
    ]);

    const result = calculateSlotConfidenceForecast(
      entries,
      excusedMap,
      '2026-10-04',
      '9AM',
      statsMap,
    );

    // m1 is excused (probability 0), m2 has 1.0 -> Sum = 1.0
    expect(result.totalCommitted).toBe(2);
    expect(result.expectedTurnup).toBe(1);
    expect(result.excusedCount).toBe(1);
    expect(result.highCount).toBe(1);
    expect(result.inactiveCount).toBe(0);
    // Confidence % = (1.0 / 2) * 100 = 50%
    expect(result.confidencePercentage).toBe(50);
  });
});

describe('getMemberConfidenceTier and getConfidenceTierLabel', () => {
  it('identifies excused member as excused tier', () => {
    const m = createMockMember('m1', 'Excused');
    const excusedMap: ExcusedMemberMap = new Map([
      ['2026-10-04', new Map([['mem-m1', new Set(['9AM'])]])],
    ]);

    expect(getMemberConfidenceTier(m, '2026-10-04', '9AM', excusedMap)).toBe('excused');
    expect(getConfidenceTierLabel('excused')).toBe('Excused');
  });

  it('identifies inactive member with 0% turnout as inactive tier', () => {
    const mInactive = { ...createMockMember('m-inact', 'Inactive'), created_at: '2020-01-01' };
    const statsMap = new Map<string, MemberAttendanceStats>([
      ['m-inact', { attendanceScore: -3, committed: 3, attended: 0, turnupRate: 0 }],
    ]);

    expect(getMemberConfidenceTier(mInactive, '2026-10-04', '9AM', undefined, statsMap)).toBe(
      'inactive',
    );
    expect(getConfidenceTierLabel('inactive')).toBe('Inactive');
  });

  it('evaluates solid, moderate, and at risk tiers based on turnup rate with 70% solid threshold', () => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() - 5);
    const mSolid = createMockMember('m-solid', 'Solid');
    const mSolidThreshold = createMockMember('m-solid-72', 'Solid72');
    const mMod = createMockMember('m-mod', 'Mod');
    const mModLow = createMockMember('m-mod-low', 'ModLow');
    const mRisk = createMockMember('m-risk', 'Risk');
    const mNew = { ...createMockMember('m-new', 'New'), created_at: newDate.toISOString() };

    const statsMap = new Map<string, MemberAttendanceStats>([
      ['m-solid', { attendanceScore: 10, committed: 10, attended: 9, turnupRate: 0.9 }],
      ['m-solid-72', { attendanceScore: 4.5, committed: 12, attended: 8, turnupRate: 8 / 11 }], // 72.7% -> Solid (>=0.7)
      ['m-mod', { attendanceScore: 5, committed: 10, attended: 6, turnupRate: 0.6 }],
      ['m-mod-low', { attendanceScore: 1, committed: 13, attended: 6, turnupRate: 0.46 }], // 46% -> Moderate
      ['m-risk', { attendanceScore: -2, committed: 10, attended: 3, turnupRate: 0.35 }], // 35% -> At risk
    ]);

    expect(getMemberConfidenceTier(mSolid, '2026-10-04', '9AM', undefined, statsMap)).toBe('solid');
    expect(getMemberConfidenceTier(mSolidThreshold, '2026-10-04', '9AM', undefined, statsMap)).toBe(
      'solid',
    );
    expect(getMemberConfidenceTier(mMod, '2026-10-04', '9AM', undefined, statsMap)).toBe(
      'moderate',
    );
    expect(getMemberConfidenceTier(mModLow, '2026-10-04', '9AM', undefined, statsMap)).toBe(
      'moderate',
    );
    expect(getMemberConfidenceTier(mRisk, '2026-10-04', '9AM', undefined, statsMap)).toBe(
      'at_risk',
    );
    // New member defaults to 0.8 -> solid
    expect(getMemberConfidenceTier(mNew, '2026-10-04', '9AM', undefined, statsMap)).toBe('solid');

    expect(getConfidenceTierLabel('solid')).toBe('Solid');
    expect(getConfidenceTierLabel('moderate')).toBe('Moderate');
    expect(getConfidenceTierLabel('at_risk')).toBe('At Risk');
    expect(getConfidenceTierLabel('inactive')).toBe('Inactive');
  });
});

describe('getMemberConfidenceTooltip', () => {
  it('returns appropriate explanation for excused volunteers', () => {
    expect(getMemberConfidenceTooltip(true)).toBe(
      'Excused: Submitted an approved excuse request for this service slot.',
    );
  });

  it('explains at_risk category with historical commitments and turnup rate', () => {
    const stats: MemberAttendanceStats = {
      attendanceScore: -2,
      committed: 10,
      attended: 3,
      turnupRate: 0.3,
    };
    expect(getMemberConfidenceTooltip(false, stats)).toBe(
      'At Risk (30% turnup): Attended 3 of 10 scheduled commitments in recent weeks (<40% threshold).',
    );
  });

  it('explains moderate category with historical commitments and turnup rate', () => {
    const stats: MemberAttendanceStats = {
      attendanceScore: 5,
      committed: 8,
      attended: 4,
      turnupRate: 0.5,
    };
    expect(getMemberConfidenceTooltip(false, stats)).toBe(
      'Moderate (50% turnup): Attended 4 of 8 scheduled commitments in recent weeks (40%–69% range).',
    );
  });

  it('explains solid category with historical commitments', () => {
    const stats: MemberAttendanceStats = {
      attendanceScore: 10,
      committed: 10,
      attended: 9,
      turnupRate: 0.9,
    };
    expect(getMemberConfidenceTooltip(false, stats)).toBe(
      'Solid (90% turnup): Attended 9 of 10 scheduled commitments in recent weeks (≥70% threshold).',
    );
  });

  it('provides default fallback explanation when no attendance stats are recorded', () => {
    expect(getMemberConfidenceTooltip(false, undefined)).toBe(
      'Solid (80% turnup): High reliability volunteer (80% default baseline rate).',
    );
  });

  it('provides inactive explanation for members with 0 attendance data joined over 30 days ago', () => {
    const oldMember = { created_at: '2024-01-01T00:00:00Z' };
    expect(getMemberConfidenceTooltip(false, undefined, undefined, oldMember)).toBe(
      'Inactive: Member has 0% attendance data recorded over the past 30+ days.',
    );
  });

  it('provides inactive explanation with commitment count for members with 0% turnout', () => {
    const oldMember = { created_at: '2024-01-01T00:00:00Z' };
    const zeroStats: MemberAttendanceStats = {
      attendanceScore: -4,
      committed: 4,
      attended: 0,
      turnupRate: 0,
    };
    expect(getMemberConfidenceTooltip(false, zeroStats, undefined, oldMember)).toBe(
      'Inactive (0% turnup): Attended 0 of 4 scheduled commitments.',
    );
  });

  it('respects custom confidence thresholds for tooltips', () => {
    const customThresholds = { solid: 0.85, moderate: 0.5, defaultTurnupRate: 0.6 };
    expect(getMemberConfidenceTooltip(false, undefined, customThresholds)).toBe(
      'Moderate (60% turnup): Fair attendance fidelity (50%–84% range).',
    );
  });
});

describe('isMemberInactiveWithoutAttendance', () => {
  it('returns false if member has recorded commitments and positive attendance', () => {
    const stats: MemberAttendanceStats = {
      attendanceScore: 5,
      committed: 4,
      attended: 3,
      turnupRate: 0.75,
    };
    const oldMember = { created_at: '2020-01-01' };
    expect(isMemberInactiveWithoutAttendance(oldMember, stats)).toBe(false);
  });

  it('returns true if member has 0% turnout (0 attended commitments) and joined > 30 days ago', () => {
    const stats: MemberAttendanceStats = {
      attendanceScore: -3,
      committed: 3,
      attended: 0,
      turnupRate: 0,
    };
    const oldMember = { created_at: '2020-01-01' };
    expect(isMemberInactiveWithoutAttendance(oldMember, stats)).toBe(true);
  });

  it('returns false if member has 0% turnout but is a new member (<= 30 days ago)', () => {
    const stats: MemberAttendanceStats = {
      attendanceScore: -1,
      committed: 1,
      attended: 0,
      turnupRate: 0,
    };
    const newDate = new Date();
    newDate.setDate(newDate.getDate() - 10);
    const newMember = { created_at: newDate.toISOString() };
    expect(isMemberInactiveWithoutAttendance(newMember, stats)).toBe(false);
  });

  it('returns true if member has 0 attendance data and joined > 30 days ago', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45);
    const oldMember = { created_at: oldDate.toISOString() };
    expect(isMemberInactiveWithoutAttendance(oldMember, undefined)).toBe(true);
  });

  it('returns false if member has 0 attendance data but joined recently (<= 30 days ago)', () => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() - 10);
    const newMember = { created_at: newDate.toISOString() };
    expect(isMemberInactiveWithoutAttendance(newMember, undefined)).toBe(false);
  });
});

describe('calculateAllSundayConfidenceForecast', () => {
  it('correctly aggregates forecasts across unique members for all Sunday service slots', () => {
    const m1 = createMockMember('m1', 'SolidUser');
    const m2 = createMockMember('m2', 'ModerateUser');

    // m1 serves in 9AM and 12NN (2 slot assignments)
    // m2 serves in 12NN and 3PM (2 slot assignments)
    const entriesBySlot = {
      '9AM': [createScheduleEntry(m1)],
      '12NN': [createScheduleEntry(m1), createScheduleEntry(m2)],
      '3PM': [createScheduleEntry(m2)],
    };

    const statsMap = new Map<string, MemberAttendanceStats>([
      ['m1', { attendanceScore: 10, committed: 10, attended: 10, turnupRate: 1.0 }],
      ['m2', { attendanceScore: 5, committed: 10, attended: 5, turnupRate: 0.5 }],
    ]);

    const result = calculateAllSundayConfidenceForecast(
      entriesBySlot,
      undefined,
      '2026-10-04',
      statsMap,
    );

    // Total unique volunteers = 2 (m1 and m2)
    expect(result.totalCommitted).toBe(2);
    // Probability sum = 1.0 (m1) + 0.5 (m2) = 1.5 -> Math.round(1.5) = 2
    expect(result.expectedTurnup).toBe(2);
    expect(result.highCount).toBe(1); // m1
    expect(result.moderateCount).toBe(1); // m2
    expect(result.atRiskCount).toBe(0);
    expect(result.inactiveCount).toBe(0);
    expect(result.excusedCount).toBe(0);
  });
});
