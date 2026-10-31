import type { MemberScheduleEntry, SundayKey, TimeSlot } from '@/hooks/domain/members';
import type { AdminMember, MemberAttendanceStats } from '@/lib/domain/members';

import { SUNDAY_KEYS, isMemberExcused, normalizeStaffingRole } from './calendar';
import { DEFAULT_MEMBER_TURNUP_RATE } from './constants';
import type { ExcusedMemberMap } from './types';

function matchesRole(memberRole?: string | null, targetRole?: string | null): boolean {
  if (!memberRole || !targetRole) return false;
  const targetNorm = normalizeStaffingRole(targetRole).toLowerCase();
  if (normalizeStaffingRole(memberRole).toLowerCase() === targetNorm) return true;
  const parts = memberRole.split(/\s*[/,]\s*/).map((p) => normalizeStaffingRole(p).toLowerCase());
  return parts.includes(targetNorm);
}

export type StandInCandidateInput = {
  token: string;
  turnupRate: number;
  attendanceScore: number;
  tier: 'solid' | 'moderate';
  usualSlots?: string[];
};

export type FindStandInCandidatesOptions = {
  targetRole: string;
  targetDate: string; // YYYY-MM-DD
  targetSlot: TimeSlot;
  allMembers: AdminMember[];
  scheduleEntries: MemberScheduleEntry[];
  excusedMap?: ExcusedMemberMap;
  attendanceScoreMap?: Map<string, MemberAttendanceStats>;
  excludeMemberId?: string;
  maxCandidates?: number;
};

export type FindStandInCandidatesResult = {
  candidates: StandInCandidateInput[];
  tokenToMemberMap: Map<string, AdminMember>;
};

/**
 * Computes the SundayKey (e.g. 'first_sunday') for a given YYYY-MM-DD or Date object.
 * Returns null if the date is not a Sunday.
 */
export function getSundayKeyForDate(target: string | Date): SundayKey | null {
  const date =
    typeof target === 'string'
      ? new Date(`${target}T12:00:00Z`) // Safe UTC midday
      : new Date(target);

  if (date.getUTCDay() !== 0) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  let sundayIndex = 0;
  for (let d = 1; d <= day; d++) {
    const testDate = new Date(Date.UTC(year, month, d, 12, 0, 0));
    if (testDate.getUTCDay() === 0) {
      sundayIndex++;
    }
  }

  const keyIndex = sundayIndex - 1;
  return keyIndex >= 0 && keyIndex < SUNDAY_KEYS.length ? SUNDAY_KEYS[keyIndex] : null;
}

/**
 * Finds eligible substitute candidates for a given role, date, and service slot.
 * Ensures zero PII exposure by mapping members to anonymous USR_ tokens.
 */
export function findStandInCandidates(
  options: FindStandInCandidatesOptions,
): FindStandInCandidatesResult {
  const {
    targetRole,
    targetDate,
    targetSlot,
    allMembers,
    scheduleEntries,
    excusedMap,
    attendanceScoreMap,
    excludeMemberId,
    maxCandidates = 20,
  } = options;

  const sundayKey = getSundayKeyForDate(targetDate);

  // Set of member IDs scheduled for the target Sunday and target slot
  const committedInSlotMemberIds = new Set<string>();
  // Map of member ID to all slots they usually serve across Sunday commitments
  const memberUsualSlotsMap = new Map<string, Set<string>>();

  for (const entry of scheduleEntries) {
    const mId = entry.member.id;
    if (!memberUsualSlotsMap.has(mId)) {
      memberUsualSlotsMap.set(mId, new Set<string>());
    }
    const slotSet = memberUsualSlotsMap.get(mId)!;
    entry.timeSlots.forEach((slot) => slotSet.add(slot));

    if (sundayKey && entry.sundayKey === sundayKey && entry.timeSlots.includes(targetSlot)) {
      committedInSlotMemberIds.add(mId);
    }
  }

  // Filter candidates
  type CandidateMatch = {
    member: AdminMember;
    turnupRate: number;
    attendanceScore: number;
    tier: 'solid' | 'moderate';
    usualSlots: string[];
  };

  const matches: CandidateMatch[] = [];

  for (const member of allMembers) {
    // 1. Must be active
    if (!member.is_active) continue;

    // 2. Role must match (supports compound roles like "Prayer Coach / Usher" or shorthand "PC")
    if (!matchesRole(member.role, targetRole)) continue;

    // 3. Exclude the member being substituted
    if (excludeMemberId && member.id === excludeMemberId) continue;

    // 4. Must not already be committed in this slot on this Sunday
    if (committedInSlotMemberIds.has(member.id)) continue;

    // 5. Must not have an approved excuse for this date & slot
    if (isMemberExcused(excusedMap, targetDate, member, targetSlot)) continue;

    // 6. Check attendance metrics
    const stats = attendanceScoreMap?.get(member.id);
    const rawTurnupRate = stats?.turnupRate ?? DEFAULT_MEMBER_TURNUP_RATE;
    // Standardize turnup rate to percentage: if <= 1 (e.g. 0.8), multiply by 100
    const turnupPercent = rawTurnupRate <= 1 ? rawTurnupRate * 100 : rawTurnupRate;
    const attendanceScore = stats?.attendanceScore ?? 5.0;

    let tier: 'solid' | 'moderate' | null = null;
    if (turnupPercent >= 70 && attendanceScore >= 4.0) {
      tier = 'solid';
    } else if (turnupPercent >= 40 && attendanceScore >= 0.0) {
      tier = 'moderate';
    } else if (turnupPercent >= 30) {
      tier = 'moderate';
    }

    // Skip if below moderate / at risk (< 30% turnup or negative score)
    if (!tier) continue;

    const usualSlots = Array.from(memberUsualSlotsMap.get(member.id) ?? []);

    matches.push({
      member,
      turnupRate: turnupPercent,
      attendanceScore,
      tier,
      usualSlots,
    });
  }

  // Prioritize Solid tier candidates first
  const solidCandidates = matches.filter((m) => m.tier === 'solid');
  const moderateCandidates = matches.filter((m) => m.tier === 'moderate');

  // Sort each group by turnupRate desc, then attendanceScore desc
  const sortComparator = (a: CandidateMatch, b: CandidateMatch) => {
    if (b.turnupRate !== a.turnupRate) {
      return b.turnupRate - a.turnupRate;
    }
    return b.attendanceScore - a.attendanceScore;
  };

  solidCandidates.sort(sortComparator);
  moderateCandidates.sort(sortComparator);

  // Combine: Prioritize solid candidates first, and fill remaining slots up to maxCandidates with moderate candidates
  let selectedMatches: CandidateMatch[];
  if (solidCandidates.length >= maxCandidates) {
    selectedMatches = solidCandidates.slice(0, maxCandidates);
  } else {
    selectedMatches = [...solidCandidates, ...moderateCandidates].slice(0, maxCandidates);
  }

  // Map to anonymous tokens
  const tokenToMemberMap = new Map<string, AdminMember>();
  const candidates: StandInCandidateInput[] = selectedMatches.map((match, index) => {
    const token = `USR_${String(index + 1).padStart(3, '0')}`;
    tokenToMemberMap.set(token, match.member);

    return {
      token,
      turnupRate: Math.round(match.turnupRate),
      attendanceScore: Number(match.attendanceScore.toFixed(1)),
      tier: match.tier,
      usualSlots: match.usualSlots,
    };
  });

  return {
    candidates,
    tokenToMemberMap,
  };
}

export type FormatRecommendationReasoningOptions = {
  reasoning: string;
  candidateMember: AdminMember;
  tokenToMemberMap: Map<string, AdminMember>;
  excusedMember?: AdminMember | null;
  excusedMemberToken?: string;
};

/**
 * Resolves anonymized candidate and excused volunteer tokens in AI reasoning into readable human names,
 * or removes token artifacts so descriptions read naturally in the UI.
 */
export function formatRecommendationReasoning({
  reasoning,
  candidateMember,
  tokenToMemberMap,
  excusedMember,
  excusedMemberToken,
}: FormatRecommendationReasoningOptions): string {
  let text = reasoning;

  // 1. Resolve excused member token if present
  if (excusedMemberToken) {
    const excusedName =
      excusedMember?.nickname ||
      excusedMember?.first_name ||
      excusedMember?.full_name ||
      'the regular volunteer';
    text = text.replaceAll(excusedMemberToken, excusedName);
  }

  if (excusedMember) {
    const excusedName =
      excusedMember.nickname || excusedMember.first_name || excusedMember.full_name;
    text = text.replaceAll(`MEM_${excusedMember.id.slice(0, 6)}`, excusedName);
    text = text.replaceAll(excusedMember.id.slice(0, 6), excusedName);
  }

  // 2. Resolve candidate tokens to their volunteer names
  for (const [token, mem] of tokenToMemberMap.entries()) {
    const name = mem.nickname || mem.first_name || mem.full_name;
    text = text.replaceAll(token, name);
  }

  // 3. Remove/clean up remaining stray tokens (e.g. USR_001, MEM_xxxx, EXCUSED_VOLUNTEER)
  const candidateName = candidateMember.nickname || candidateMember.first_name || '';
  text = text.replace(
    /\b(EXCUSED_VOLUNTEER|USR_[a-zA-Z0-9_-]+|MEM_[a-zA-Z0-9_-]+)\b/gi,
    candidateName,
  );

  // 4. Remove redundant "Candidate [Name]" -> "[Name]"
  text = text.replace(/\bCandidate\s+([A-Z])/g, '$1');

  // 5. Clean up leading token punctuation or formatting e.g. ": 100% turnup" or "- 100% turnup"
  text = text
    .replace(/^[\s:,-]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 6. Ensure first letter is capitalized
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text;
}
