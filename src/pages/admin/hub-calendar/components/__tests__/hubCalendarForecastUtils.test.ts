import { describe, expect, it } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { ExcusedMemberMap } from '@/lib/domain/hub-calendar';
import type { AdminMember, MemberAttendanceStats } from '@/lib/domain/members';
import {
  calculateSlotConfidenceForecast,
  getConfidenceTierLabel,
  getMemberConfidenceTier,
  getMemberConfidenceTooltip,
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
      excusedCount: 0,
    });
  });

  it('calculates expected turnup and buckets correctly with mixed turnup rates', () => {
    const m1 = createMockMember('m1', 'Solid');
    const m2 = createMockMember('m2', 'Moderate');
    const m3 = createMockMember('m3', 'AtRisk');
    const m4 = createMockMember('m4', 'NewMember');

    const entries = [
      createScheduleEntry(m1),
      createScheduleEntry(m2),
      createScheduleEntry(m3),
      createScheduleEntry(m4),
    ];

    const statsMap = new Map<string, MemberAttendanceStats>([
      ['m1', { attendanceScore: 10, committed: 10, attended: 10, turnupRate: 1.0 }], // Solid (>=0.7)
      ['m2', { attendanceScore: 3, committed: 10, attended: 6, turnupRate: 0.6 }], // Moderate (0.4-0.69)
      ['m3', { attendanceScore: -2, committed: 10, attended: 2, turnupRate: 0.2 }], // At risk (<0.4)
      // m4 has no historical stats -> defaults to 0.8 (Solid)
    ]);

    const result = calculateSlotConfidenceForecast(
      entries,
      undefined,
      '2026-10-04',
      '9AM',
      statsMap,
    );

    // Sum of probabilities = 1.0 + 0.6 + 0.2 + 0.8 = 2.6 -> rounds to 3
    expect(result.totalCommitted).toBe(4);
    expect(result.expectedTurnup).toBe(3);
    // Confidence % = (2.6 / 4) * 100 = 65%
    expect(result.confidencePercentage).toBe(65);
    expect(result.highCount).toBe(2); // m1 and m4
    expect(result.moderateCount).toBe(1); // m2
    expect(result.atRiskCount).toBe(1); // m3
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

  it('evaluates solid, moderate, and at risk tiers based on turnup rate with 70% solid threshold', () => {
    const mSolid = createMockMember('m-solid', 'Solid');
    const mSolidThreshold = createMockMember('m-solid-72', 'Solid72');
    const mMod = createMockMember('m-mod', 'Mod');
    const mModLow = createMockMember('m-mod-low', 'ModLow');
    const mRisk = createMockMember('m-risk', 'Risk');
    const mNew = createMockMember('m-new', 'New');

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
      'Solid (80% turnup): High reliability volunteer (default baseline rate).',
    );
  });
});
