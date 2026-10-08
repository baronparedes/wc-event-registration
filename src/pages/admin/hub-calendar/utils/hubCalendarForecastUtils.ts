import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import type { ExcusedMemberMap } from '@/lib/domain/hub-calendar';
import {
  CONFIDENCE_THRESHOLDS,
  DEFAULT_MEMBER_TURNUP_RATE,
  getConfidenceTierFromRate,
  isMemberExcused,
} from '@/lib/domain/hub-calendar';
import type { MemberAttendanceStats } from '@/lib/domain/members';

export const HUB_CALENDAR_THRESHOLDS_STORAGE_KEY = 'wc:hub-calendar:confidence-thresholds';

export interface ConfidenceThresholds {
  solid: number;
  moderate: number;
  defaultTurnupRate: number;
}

export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  solid: CONFIDENCE_THRESHOLDS.SOLID,
  moderate: CONFIDENCE_THRESHOLDS.MODERATE,
  defaultTurnupRate: DEFAULT_MEMBER_TURNUP_RATE,
};

export function getStoredConfidenceThresholds(): ConfidenceThresholds {
  try {
    const raw =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(HUB_CALENDAR_THRESHOLDS_STORAGE_KEY)
        : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed?.solid === 'number' &&
        typeof parsed?.moderate === 'number' &&
        typeof parsed?.defaultTurnupRate === 'number'
      ) {
        return {
          solid: Math.min(1, Math.max(0.1, parsed.solid)),
          moderate: Math.min(parsed.solid, Math.max(0, parsed.moderate)),
          defaultTurnupRate: Math.min(1, Math.max(0, parsed.defaultTurnupRate)),
        };
      }
    }
  } catch {
    // Ignore storage parse or access errors
  }
  return { ...DEFAULT_CONFIDENCE_THRESHOLDS };
}

export function saveStoredConfidenceThresholds(thresholds: ConfidenceThresholds): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HUB_CALENDAR_THRESHOLDS_STORAGE_KEY, JSON.stringify(thresholds));
    }
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}

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
  slot?: TimeSlot,
  statsMap?: Map<string, MemberAttendanceStats>,
  thresholds: ConfidenceThresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
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
    const turnupRate = stat !== undefined ? stat.turnupRate : thresholds.defaultTurnupRate;
    probabilitySum += turnupRate;

    if (turnupRate >= thresholds.solid) {
      highCount++;
    } else if (turnupRate >= thresholds.moderate) {
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

export function calculateAllSundayConfidenceForecast(
  entriesByTimeSlot: Record<TimeSlot, MemberScheduleEntry[]>,
  excusedMap: ExcusedMemberMap | undefined,
  isoDateKey: string,
  statsMap?: Map<string, MemberAttendanceStats>,
  thresholds: ConfidenceThresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
): SlotConfidenceForecast {
  const slots: TimeSlot[] = ['9AM', '12NN', '3PM'];
  const forecasts = slots.map((s) =>
    calculateSlotConfidenceForecast(
      entriesByTimeSlot[s] || [],
      excusedMap,
      isoDateKey,
      s,
      statsMap,
      thresholds,
    ),
  );

  let totalCommitted = 0;
  let expectedTurnup = 0;
  let highCount = 0;
  let moderateCount = 0;
  let atRiskCount = 0;
  let excusedCount = 0;

  for (const f of forecasts) {
    totalCommitted += f.totalCommitted;
    expectedTurnup += f.expectedTurnup;
    highCount += f.highCount;
    moderateCount += f.moderateCount;
    atRiskCount += f.atRiskCount;
    excusedCount += f.excusedCount;
  }

  const confidencePercentage =
    totalCommitted > 0 ? Math.round((expectedTurnup / totalCommitted) * 100) : 0;

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
  slot?: TimeSlot,
  excusedMap?: ExcusedMemberMap,
  statsMap?: Map<string, MemberAttendanceStats>,
  thresholds: ConfidenceThresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
): ConfidenceTier {
  if (isMemberExcused(excusedMap, isoDateKey, member, slot)) {
    return 'excused';
  }

  const stat = member.id ? statsMap?.get(member.id) : undefined;
  const turnupRate = stat !== undefined ? stat.turnupRate : thresholds.defaultTurnupRate;

  return getConfidenceTierFromRate(turnupRate, thresholds);
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
  thresholds: ConfidenceThresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
): string {
  if (isExcused) {
    return 'Excused: Submitted an approved excuse request for this service slot.';
  }

  const turnupRate = stats !== undefined ? stats.turnupRate : thresholds.defaultTurnupRate;
  const percentage = Math.round(turnupRate * 100);
  const tier = getConfidenceTierFromRate(turnupRate, thresholds);

  const solidPct = Math.round(thresholds.solid * 100);
  const modPct = Math.round(thresholds.moderate * 100);

  if (tier === 'at_risk') {
    if (stats && stats.committed > 0) {
      return `At Risk (${percentage}% turnup): Attended ${stats.attended} of ${stats.committed} scheduled commitments in recent weeks (<${modPct}% threshold).`;
    }
    return `At Risk (${percentage}% turnup): Low historical attendance turnup rate (<${modPct}% threshold).`;
  }

  if (tier === 'moderate') {
    if (stats && stats.committed > 0) {
      return `Moderate (${percentage}% turnup): Attended ${stats.attended} of ${stats.committed} scheduled commitments in recent weeks (${modPct}%–${solidPct - 1}% range).`;
    }
    return `Moderate (${percentage}% turnup): Fair attendance fidelity (${modPct}%–${solidPct - 1}% range).`;
  }

  // Solid
  if (stats && stats.committed > 0) {
    return `Solid (${percentage}% turnup): Attended ${stats.attended} of ${stats.committed} scheduled commitments in recent weeks (≥${solidPct}% threshold).`;
  }
  return `Solid (${percentage}% turnup): High reliability volunteer (${percentage}% default baseline rate).`;
}
