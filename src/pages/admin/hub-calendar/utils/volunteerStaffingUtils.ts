import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import type { ExcusedMemberMap } from '@/lib/domain/hub-calendar';
import { DEFAULT_MEMBER_TURNUP_RATE, isMemberExcused } from '@/lib/domain/hub-calendar';
import type { MemberAttendanceStats } from '@/lib/domain/members';

export const DEFAULT_VOLUNTEER_ROLE_TARGETS: Record<string, number> = {
  Usher: 25,
  'Backroom Support': 10,
  'Prayer Coach': 50,
  'IMT Support': 4,
  'VMT Support': 2,
};

export const ORDERED_STANDARD_ROLES = [
  'Usher',
  'Backroom Support',
  'Prayer Coach',
  'IMT Support',
  'VMT Support',
] as const;

export const HUB_CALENDAR_STAFFING_TARGETS_STORAGE_KEY = 'wc:hub-calendar:volunteer-targets';

export function normalizeStaffingRole(rawRole?: string | null): string {
  if (!rawRole || !rawRole.trim()) {
    return 'General Volunteer';
  }
  const trimmed = rawRole.trim();
  const firstPart = trimmed.split(/\s*[/,]\s*/)[0].trim();

  if (/^usher/i.test(firstPart)) return 'Usher';
  if (/^backroom/i.test(firstPart)) return 'Backroom Support';
  if (/^prayer\s*coach|^pc\b/i.test(firstPart)) return 'Prayer Coach';
  if (/^imt/i.test(firstPart)) return 'IMT Support';
  if (/^vmt/i.test(firstPart)) return 'VMT Support';
  if (/^oic/i.test(firstPart)) return 'OIC';

  return firstPart || 'General Volunteer';
}

export function getStoredVolunteerTargets(): Record<string, number> {
  try {
    if (typeof localStorage === 'undefined') {
      return { ...DEFAULT_VOLUNTEER_ROLE_TARGETS };
    }
    const raw = localStorage.getItem(HUB_CALENDAR_STAFFING_TARGETS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VOLUNTEER_ROLE_TARGETS };

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const sanitized: Record<string, number> = { ...DEFAULT_VOLUNTEER_ROLE_TARGETS };
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          sanitized[key] = Math.round(value);
        }
      }
      return sanitized;
    }
  } catch {
    // Ignore storage parse or access errors
  }
  return { ...DEFAULT_VOLUNTEER_ROLE_TARGETS };
}

export function saveStoredVolunteerTargets(targets: Record<string, number>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HUB_CALENDAR_STAFFING_TARGETS_STORAGE_KEY, JSON.stringify(targets));
    }
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}

export interface RoleStaffingNeed {
  role: string;
  target: number;
  committed: number;
  excused: number;
  expectedTurnup: number;
  needed: number;
  surplus: number;
  fulfillmentPercentage: number;
}

export interface SlotStaffingForecast {
  slot: TimeSlot | 'ALL';
  totalTarget: number;
  totalCommitted: number;
  totalExcused: number;
  totalExpectedTurnup: number;
  totalNeeded: number;
  overallFulfillmentPercentage: number;
  roleBreakdown: RoleStaffingNeed[];
}

export function calculateSlotStaffingNeeds(
  entries: MemberScheduleEntry[],
  excusedMap: ExcusedMemberMap | undefined,
  isoDateKey: string,
  slot: TimeSlot,
  targets: Record<string, number> = DEFAULT_VOLUNTEER_ROLE_TARGETS,
  statsMap?: Map<string, MemberAttendanceStats>,
): SlotStaffingForecast {
  // Map normalized role to entries
  const roleEntriesMap = new Map<
    string,
    { committed: MemberScheduleEntry[]; excusedCount: number; probabilitySum: number }
  >();

  // Ensure all configured target roles are pre-initialized in order
  for (const role of Object.keys(targets)) {
    roleEntriesMap.set(role, { committed: [], excusedCount: 0, probabilitySum: 0 });
  }

  for (const entry of entries) {
    const normalizedRole = normalizeStaffingRole(entry.member.role);
    if (!roleEntriesMap.has(normalizedRole)) {
      roleEntriesMap.set(normalizedRole, { committed: [], excusedCount: 0, probabilitySum: 0 });
    }

    const group = roleEntriesMap.get(normalizedRole)!;
    const isExcused = isMemberExcused(excusedMap, isoDateKey, entry.member, slot);
    if (isExcused) {
      group.excusedCount++;
      continue;
    }

    group.committed.push(entry);
    const stat = statsMap?.get(entry.member.id);
    const turnupRate = stat !== undefined ? stat.turnupRate : DEFAULT_MEMBER_TURNUP_RATE;
    group.probabilitySum += turnupRate;
  }

  const roleBreakdown: RoleStaffingNeed[] = [];
  let totalTarget = 0;
  let totalCommitted = 0;
  let totalExcused = 0;
  let totalProbabilitySum = 0;
  let totalNeeded = 0;

  // Preserve order: standard roles first, then others alphabetically
  const allRoles = Array.from(roleEntriesMap.keys()).sort((a, b) => {
    const aIdx = ORDERED_STANDARD_ROLES.indexOf(a as (typeof ORDERED_STANDARD_ROLES)[number]);
    const bIdx = ORDERED_STANDARD_ROLES.indexOf(b as (typeof ORDERED_STANDARD_ROLES)[number]);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  for (const role of allRoles) {
    const group = roleEntriesMap.get(role)!;
    const target = targets[role] ?? 0;
    const committed = group.committed.length;
    const excused = group.excusedCount;
    const expectedTurnup = Math.round(group.probabilitySum);
    const needed = Math.max(0, target - expectedTurnup);
    const surplus = Math.max(0, expectedTurnup - target);
    const fulfillmentPercentage =
      target > 0 ? Math.min(100, Math.round((expectedTurnup / target) * 100)) : 100;

    totalTarget += target;
    totalCommitted += committed;
    totalExcused += excused;
    totalProbabilitySum += group.probabilitySum;
    totalNeeded += needed;

    roleBreakdown.push({
      role,
      target,
      committed,
      excused,
      expectedTurnup,
      needed,
      surplus,
      fulfillmentPercentage,
    });
  }

  const totalExpectedTurnup = Math.round(totalProbabilitySum);
  const overallFulfillmentPercentage =
    totalTarget > 0 ? Math.min(100, Math.round((totalExpectedTurnup / totalTarget) * 100)) : 100;

  return {
    slot,
    totalTarget,
    totalCommitted,
    totalExcused,
    totalExpectedTurnup,
    totalNeeded,
    overallFulfillmentPercentage,
    roleBreakdown,
  };
}

export function calculateAllSundayStaffingNeeds(
  entriesByTimeSlot: Record<TimeSlot, MemberScheduleEntry[]>,
  excusedMap: ExcusedMemberMap | undefined,
  isoDateKey: string,
  targets: Record<string, number> = DEFAULT_VOLUNTEER_ROLE_TARGETS,
  statsMap?: Map<string, MemberAttendanceStats>,
): SlotStaffingForecast {
  const slots: TimeSlot[] = ['9AM', '12NN', '3PM'];
  const slotForecasts = slots.map((slot) =>
    calculateSlotStaffingNeeds(
      entriesByTimeSlot[slot] || [],
      excusedMap,
      isoDateKey,
      slot,
      targets,
      statsMap,
    ),
  );

  const roleAccumulator = new Map<
    string,
    { target: number; committed: number; excused: number; expectedTurnup: number; needed: number }
  >();

  for (const forecast of slotForecasts) {
    for (const item of forecast.roleBreakdown) {
      if (!roleAccumulator.has(item.role)) {
        roleAccumulator.set(item.role, {
          target: 0,
          committed: 0,
          excused: 0,
          expectedTurnup: 0,
          needed: 0,
        });
      }
      const acc = roleAccumulator.get(item.role)!;
      acc.target += item.target;
      acc.committed += item.committed;
      acc.excused += item.excused;
      acc.expectedTurnup += item.expectedTurnup;
      acc.needed += item.needed;
    }
  }

  const roleBreakdown: RoleStaffingNeed[] = [];
  let totalTarget = 0;
  let totalCommitted = 0;
  let totalExcused = 0;
  let totalExpectedTurnup = 0;
  let totalNeeded = 0;

  const allRoles = Array.from(roleAccumulator.keys()).sort((a, b) => {
    const aIdx = ORDERED_STANDARD_ROLES.indexOf(a as (typeof ORDERED_STANDARD_ROLES)[number]);
    const bIdx = ORDERED_STANDARD_ROLES.indexOf(b as (typeof ORDERED_STANDARD_ROLES)[number]);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  for (const role of allRoles) {
    const acc = roleAccumulator.get(role)!;
    const surplus = Math.max(0, acc.expectedTurnup - acc.target);
    const fulfillmentPercentage =
      acc.target > 0 ? Math.min(100, Math.round((acc.expectedTurnup / acc.target) * 100)) : 100;

    totalTarget += acc.target;
    totalCommitted += acc.committed;
    totalExcused += acc.excused;
    totalExpectedTurnup += acc.expectedTurnup;
    totalNeeded += acc.needed;

    roleBreakdown.push({
      role,
      target: acc.target,
      committed: acc.committed,
      excused: acc.excused,
      expectedTurnup: acc.expectedTurnup,
      needed: acc.needed,
      surplus,
      fulfillmentPercentage,
    });
  }

  const overallFulfillmentPercentage =
    totalTarget > 0 ? Math.min(100, Math.round((totalExpectedTurnup / totalTarget) * 100)) : 100;

  return {
    slot: 'ALL',
    totalTarget,
    totalCommitted,
    totalExcused,
    totalExpectedTurnup,
    totalNeeded,
    overallFulfillmentPercentage,
    roleBreakdown,
  };
}
