import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import type { ExcusedMemberMap } from '@/lib/domain/hub-calendar';
import {
  CONFIDENCE_THRESHOLDS,
  DEFAULT_MEMBER_TURNUP_RATE,
  getConfidenceTierFromRate,
  isMemberExcused,
} from '@/lib/domain/hub-calendar';
import type { MemberAttendanceStats } from '@/lib/domain/members';

export interface SlotConfidenceForecast {
  totalCommitted: number;
  expectedTurnup: number;
  confidencePercentage: number;
  highCount: number;
  moderateCount: number;
  atRiskCount: number;
  excusedCount: number;
}

export function calculateSlotConfidenceForecast(
  entries: MemberScheduleEntry[],
  excusedMap: ExcusedMemberMap | undefined,
  isoDateKey: string,
  slot: TimeSlot,
  statsMap?: Map<string, MemberAttendanceStats>,
): SlotConfidenceForecast {
  const totalCommitted = entries.length;
  if (totalCommitted === 0) {
    return {
      totalCommitted: 0,
      expectedTurnup: 0,
      confidencePercentage: 0,
      highCount: 0,
      moderateCount: 0,
      atRiskCount: 0,
      excusedCount: 0,
    };
  }

  let probabilitySum = 0;
  let highCount = 0;
  let moderateCount = 0;
  let atRiskCount = 0;
  let excusedCount = 0;

  for (const entry of entries) {
    const isExcused = isMemberExcused(excusedMap, isoDateKey, entry.member, slot);
    if (isExcused) {
      excusedCount++;
      continue;
    }

    const stat = statsMap?.get(entry.member.id);
    const turnupRate = stat !== undefined ? stat.turnupRate : DEFAULT_MEMBER_TURNUP_RATE;
    probabilitySum += turnupRate;

    if (turnupRate >= CONFIDENCE_THRESHOLDS.SOLID) {
      highCount++;
    } else if (turnupRate >= CONFIDENCE_THRESHOLDS.MODERATE) {
      moderateCount++;
    } else {
      atRiskCount++;
    }
  }

  const expectedTurnup = Math.round(probabilitySum);
  const confidencePercentage =
    totalCommitted > 0 ? Math.round((probabilitySum / totalCommitted) * 100) : 0;

  return {
    totalCommitted,
    expectedTurnup,
    confidencePercentage,
    highCount,
    moderateCount,
    atRiskCount,
    excusedCount,
  };
}

export type ConfidenceTier = 'solid' | 'moderate' | 'at_risk' | 'excused';

export function getMemberConfidenceTier(
  member: { id?: string | null; member_id?: string | null },
  isoDateKey: string,
  slot: TimeSlot,
  excusedMap?: ExcusedMemberMap,
  statsMap?: Map<string, MemberAttendanceStats>,
): ConfidenceTier {
  if (isMemberExcused(excusedMap, isoDateKey, member, slot)) {
    return 'excused';
  }

  const stat = member.id ? statsMap?.get(member.id) : undefined;
  const turnupRate = stat !== undefined ? stat.turnupRate : DEFAULT_MEMBER_TURNUP_RATE;

  return getConfidenceTierFromRate(turnupRate);
}

export function getConfidenceTierLabel(tier: ConfidenceTier): string {
  switch (tier) {
    case 'solid':
      return 'Solid';
    case 'moderate':
      return 'Moderate';
    case 'at_risk':
      return 'At Risk';
    case 'excused':
      return 'Excused';
  }
}

export function getMemberConfidenceTooltip(
  isExcused: boolean,
  stats?: MemberAttendanceStats,
): string {
  if (isExcused) {
    return 'Excused: Submitted an approved excuse request for this service slot.';
  }

  const turnupRate = stats !== undefined ? stats.turnupRate : DEFAULT_MEMBER_TURNUP_RATE;
  const percentage = Math.round(turnupRate * 100);
  const tier = getConfidenceTierFromRate(turnupRate);

  if (tier === 'at_risk') {
    if (stats && stats.committed > 0) {
      return `At Risk (${percentage}% turnup): Attended ${stats.attended} of ${stats.committed} scheduled commitments in recent weeks (<40% threshold).`;
    }
    return `At Risk (${percentage}% turnup): Low historical attendance turnup rate (<40% threshold).`;
  }

  if (tier === 'moderate') {
    if (stats && stats.committed > 0) {
      return `Moderate (${percentage}% turnup): Attended ${stats.attended} of ${stats.committed} scheduled commitments in recent weeks (40%–69% range).`;
    }
    return `Moderate (${percentage}% turnup): Fair attendance fidelity (40%–69% range).`;
  }

  // Solid
  if (stats && stats.committed > 0) {
    return `Solid (${percentage}% turnup): Attended ${stats.attended} of ${stats.committed} scheduled commitments in recent weeks (≥70% threshold).`;
  }
  return `Solid (${percentage}% turnup): High reliability volunteer (default baseline rate).`;
}
