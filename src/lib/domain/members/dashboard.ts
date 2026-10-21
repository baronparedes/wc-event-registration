import { MATRIX_SLOT_LABELS, SERVICE_SUNDAY_LABELS } from '@/lib/domain/services/service-matrix';

import type { MemberUserRow } from './api';

export type MemberRoleStat = {
  role: string;
  count: number;
  percentage: number;
};

export type MemberAgeBracketStat = {
  bracket: string;
  minAge?: number;
  maxAge?: number;
  count: number;
  percentage: number;
};

export type MemberAgeDemographics = {
  totalWithDob: number;
  totalMembers: number;
  averageAge: number | null;
  medianAge: number | null;
  coveragePercentage: number;
  brackets: MemberAgeBracketStat[];
};

export type MemberSundayCommitmentMember = {
  id: string;
  fullName: string;
  role: string;
  avatarObjectKey: string | null;
};

export type MemberSundayCommitmentSlot = {
  sundayKey: 'first_sunday' | 'second_sunday' | 'third_sunday' | 'fourth_sunday' | 'fifth_sunday';
  sundayLabel: string;
  timeSlot: '9AM' | '12NN' | '3PM';
  timeSlotLabel: string;
  count: number;
  percentage: number;
  members: MemberSundayCommitmentMember[];
};

export type MemberSundayCommitmentHeatmap = {
  slots: MemberSundayCommitmentSlot[];
  maxCount: number;
  totalCommittedMembers: number;
  sundays: Array<{
    key: 'first_sunday' | 'second_sunday' | 'third_sunday' | 'fourth_sunday' | 'fifth_sunday';
    label: string;
    shortLabel: string;
  }>;
  timeSlots: Array<{
    key: '9AM' | '12NN' | '3PM';
    label: string;
  }>;
};

export type MemberDGroupRow = {
  id: string;
  memberId: string;
  fullName: string;
  role: string;
  avatarObjectKey: string | null;
  hasDGroup: boolean;
  dgroupLeader: string | null;
  dgroupStatus: string | null;
  dgroupMemberSince: string | null;
  isDGroupLeader: boolean;
};

export type MemberDGroupStatusStat = {
  status: string;
  count: number;
  percentage: number;
};

export type MemberDGroupAnalytics = {
  totalMembers: number;
  inDGroupCount: number;
  missingDGroupCount: number;
  coveragePercentage: number;
  dgroupLeaderCount: number;
  dgroupMemberCount: number;
  statusBreakdown: MemberDGroupStatusStat[];
  members: MemberDGroupRow[];
};

export type MemberDashboardData = {
  totalActiveMembers: number;
  roleDistributions: MemberRoleStat[];
  ageDemographics: MemberAgeDemographics;
  commitmentHeatmap: MemberSundayCommitmentHeatmap;
  dgroupAnalytics: MemberDGroupAnalytics;
};

const PROMOTED_DGROUP_KEYS = {
  leader: ['dgroup_leader', 'dgroupleader', 'd_group_leader', 'DGroup Leader'],
  status: ['dgroup_status', 'dgroupstatus', 'd_group_status', 'DGroup Status'],
  memberSince: [
    'dgroup_member_since',
    'dgroupmember since',
    'd_group_member_since',
    'DGroup Member Since',
  ],
  isLeader: [
    'is_dgroup_leader',
    'isdgroupleader',
    'is_d_group_leader',
    'Is DGroup Leader',
    'dgroup_leader_status',
  ],
} as const;

const SUNDAYS_CONFIG = [
  {
    key: 'first_sunday',
    label: SERVICE_SUNDAY_LABELS.first_sunday.label,
    shortLabel: SERVICE_SUNDAY_LABELS.first_sunday.shortLabel,
  },
  {
    key: 'second_sunday',
    label: SERVICE_SUNDAY_LABELS.second_sunday.label,
    shortLabel: SERVICE_SUNDAY_LABELS.second_sunday.shortLabel,
  },
  {
    key: 'third_sunday',
    label: SERVICE_SUNDAY_LABELS.third_sunday.label,
    shortLabel: SERVICE_SUNDAY_LABELS.third_sunday.shortLabel,
  },
  {
    key: 'fourth_sunday',
    label: SERVICE_SUNDAY_LABELS.fourth_sunday.label,
    shortLabel: SERVICE_SUNDAY_LABELS.fourth_sunday.shortLabel,
  },
  {
    key: 'fifth_sunday',
    label: SERVICE_SUNDAY_LABELS.fifth_sunday.label,
    shortLabel: SERVICE_SUNDAY_LABELS.fifth_sunday.shortLabel,
  },
] as const;

const TIME_SLOTS_CONFIG = [
  { key: '9AM', label: MATRIX_SLOT_LABELS['9AM'] },
  { key: '12NN', label: MATRIX_SLOT_LABELS['12NN'] },
  { key: '3PM', label: MATRIX_SLOT_LABELS['3PM'] },
] as const;

export function getMetadataStringValue(
  metadata: Record<string, unknown> | null | undefined,
  candidateKeys: readonly string[],
): string | undefined {
  if (!metadata) return undefined;

  for (const candidate of candidateKeys) {
    const directVal = metadata[candidate];
    if (typeof directVal === 'string' && directVal.trim() !== '') {
      return directVal.trim();
    }
  }

  const normalizedCandidates = candidateKeys.map((k) => k.toLowerCase().replace(/[\s_-]+/g, ''));
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string' && value.trim() !== '') {
      const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, '');
      if (normalizedCandidates.includes(normalizedKey)) {
        return value.trim();
      }
    }
  }

  return undefined;
}

export function calculateAge(dobString: string | null | undefined, asOf: Date): number | null {
  if (!dobString) return null;
  const trimmed = dobString.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/[-/T ]/);
  if (parts.length < 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const birthDate = new Date(year, month, day);
  if (isNaN(birthDate.getTime())) return null;

  let age = asOf.getFullYear() - birthDate.getFullYear();
  const m = asOf.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 0 && age <= 125 ? age : null;
}

export function parseSundayTimeSlots(value: unknown): Array<'9AM' | '12NN' | '3PM'> {
  if (typeof value !== 'string') return [];

  const rawTokens = value
    .split(/[,/]+/)
    .map((token) => token.trim().toUpperCase().replace(/\s+/g, ''));

  const parsed = new Set<'9AM' | '12NN' | '3PM'>();
  for (const token of rawTokens) {
    if (token === '9AM' || token === '9:00AM') parsed.add('9AM');
    if (token === '12NN' || token === '12PM' || token === '12:00NN' || token === '12:00PM') {
      parsed.add('12NN');
    }
    if (token === '3PM' || token === '3:00PM') parsed.add('3PM');
  }

  return Array.from(parsed);
}

export function extractPrimaryRole(rawRole?: unknown): string {
  if (typeof rawRole !== 'string' || !rawRole.trim()) {
    return 'General Volunteer';
  }
  const trimmed = rawRole.trim();
  const parts = trimmed.split(/\s*[/,]\s*/).filter(Boolean);
  return parts[0]?.trim() || 'General Volunteer';
}

export function normalizeDGroupStatus(val: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === 'leader' || lower === 'dgroup leader') return 'Leader';
  if (lower === 'member' || lower === 'dgroup member') return 'Member';
  if (lower === 'active') return 'Active';
  if (lower === 'inactive') return 'Inactive';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function computeMemberDashboardData(
  members: MemberUserRow[],
  asOf: Date = new Date(),
): MemberDashboardData {
  const activeMembers = members.filter((m) => m.is_active !== false);
  const totalActiveMembers = activeMembers.length;

  // 1. Role Distributions (Primary Roles Only)
  const roleCounts = new Map<string, number>();
  for (const member of activeMembers) {
    const role = extractPrimaryRole(member.role);
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }

  const roleDistributions: MemberRoleStat[] = Array.from(roleCounts.entries())
    .map(([role, count]) => ({
      role,
      count,
      percentage: totalActiveMembers > 0 ? Math.round((count / totalActiveMembers) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 2. Age Demographics
  const bracketsDefinition: Array<{
    bracket: string;
    minAge?: number;
    maxAge?: number;
  }> = [
    { bracket: '< 18', maxAge: 17 },
    { bracket: '18–24', minAge: 18, maxAge: 24 },
    { bracket: '25–34', minAge: 25, maxAge: 34 },
    { bracket: '35–44', minAge: 35, maxAge: 44 },
    { bracket: '45–54', minAge: 45, maxAge: 54 },
    { bracket: '55–64', minAge: 55, maxAge: 64 },
    { bracket: '65+', minAge: 65 },
    { bracket: 'Unspecified' },
  ];

  const bracketCounts = new Map<string, number>();
  for (const b of bracketsDefinition) {
    bracketCounts.set(b.bracket, 0);
  }

  const validAges: number[] = [];
  for (const member of activeMembers) {
    const age = calculateAge(member.date_of_birth, asOf);
    if (age === null) {
      bracketCounts.set('Unspecified', (bracketCounts.get('Unspecified') ?? 0) + 1);
    } else {
      validAges.push(age);
      if (age < 18) {
        bracketCounts.set('< 18', (bracketCounts.get('< 18') ?? 0) + 1);
      } else if (age <= 24) {
        bracketCounts.set('18–24', (bracketCounts.get('18–24') ?? 0) + 1);
      } else if (age <= 34) {
        bracketCounts.set('25–34', (bracketCounts.get('25–34') ?? 0) + 1);
      } else if (age <= 44) {
        bracketCounts.set('35–44', (bracketCounts.get('35–44') ?? 0) + 1);
      } else if (age <= 54) {
        bracketCounts.set('45–54', (bracketCounts.get('45–54') ?? 0) + 1);
      } else if (age <= 64) {
        bracketCounts.set('55–64', (bracketCounts.get('55–64') ?? 0) + 1);
      } else {
        bracketCounts.set('65+', (bracketCounts.get('65+') ?? 0) + 1);
      }
    }
  }

  const totalWithDob = validAges.length;
  let averageAge: number | null = null;
  let medianAge: number | null = null;

  if (totalWithDob > 0) {
    const sum = validAges.reduce((acc, curr) => acc + curr, 0);
    averageAge = Math.round((sum / totalWithDob) * 10) / 10;

    const sortedAges = [...validAges].sort((a, b) => a - b);
    const mid = Math.floor(sortedAges.length / 2);
    medianAge =
      sortedAges.length % 2 !== 0
        ? sortedAges[mid]
        : Math.round(((sortedAges[mid - 1] + sortedAges[mid]) / 2) * 10) / 10;
  }

  const ageBrackets: MemberAgeBracketStat[] = bracketsDefinition.map((def) => {
    const count = bracketCounts.get(def.bracket) ?? 0;
    return {
      bracket: def.bracket,
      minAge: def.minAge,
      maxAge: def.maxAge,
      count,
      percentage: totalActiveMembers > 0 ? Math.round((count / totalActiveMembers) * 1000) / 10 : 0,
    };
  });

  const ageDemographics: MemberAgeDemographics = {
    totalWithDob,
    totalMembers: totalActiveMembers,
    averageAge,
    medianAge,
    coveragePercentage:
      totalActiveMembers > 0 ? Math.round((totalWithDob / totalActiveMembers) * 1000) / 10 : 0,
    brackets: ageBrackets,
  };

  // 3. Sunday Commitment Heatmaps
  const slotMap = new Map<string, MemberSundayCommitmentMember[]>();
  for (const s of SUNDAYS_CONFIG) {
    for (const t of TIME_SLOTS_CONFIG) {
      slotMap.set(`${s.key}_${t.key}`, []);
    }
  }

  const committedMembersSet = new Set<string>();

  for (const member of activeMembers) {
    const metadata = (member.metadata as Record<string, unknown> | null) ?? {};
    let hasAnyCommitment = false;

    for (const s of SUNDAYS_CONFIG) {
      const rawSundayVal = metadata[s.key];
      const parsedSlots = parseSundayTimeSlots(rawSundayVal);

      for (const slot of parsedSlots) {
        const key = `${s.key}_${slot}`;
        const list = slotMap.get(key);
        if (list) {
          list.push({
            id: member.id,
            fullName: member.full_name,
            role: extractPrimaryRole(member.role),
            avatarObjectKey: member.avatar_object_key,
          });
          hasAnyCommitment = true;
        }
      }
    }

    if (hasAnyCommitment) {
      committedMembersSet.add(member.id);
    }
  }

  const totalCommittedMembers = committedMembersSet.size;
  let maxSlotCount = 0;

  const slots: MemberSundayCommitmentSlot[] = [];
  for (const s of SUNDAYS_CONFIG) {
    for (const t of TIME_SLOTS_CONFIG) {
      const list = slotMap.get(`${s.key}_${t.key}`) ?? [];
      const count = list.length;
      if (count > maxSlotCount) {
        maxSlotCount = count;
      }

      slots.push({
        sundayKey: s.key,
        sundayLabel: s.label,
        timeSlot: t.key,
        timeSlotLabel: t.label,
        count,
        percentage:
          totalCommittedMembers > 0 ? Math.round((count / totalCommittedMembers) * 1000) / 10 : 0,
        members: list,
      });
    }
  }

  const commitmentHeatmap: MemberSundayCommitmentHeatmap = {
    slots,
    maxCount: maxSlotCount,
    totalCommittedMembers,
    sundays: SUNDAYS_CONFIG.map((s) => ({
      key: s.key,
      label: s.label,
      shortLabel: s.shortLabel,
    })),
    timeSlots: TIME_SLOTS_CONFIG.map((t) => ({
      key: t.key,
      label: t.label,
    })),
  };

  // 4. DGroup Analytics & Directory
  // Step 1: Collect all names referenced as dgroup_leader
  const referencedLeaders = new Set<string>();
  for (const member of activeMembers) {
    const metadata = (member.metadata as Record<string, unknown> | null) ?? {};
    const leaderVal = getMetadataStringValue(metadata, PROMOTED_DGROUP_KEYS.leader);
    if (leaderVal) {
      referencedLeaders.add(leaderVal.toLowerCase());
    }
  }

  const dgroupRows: MemberDGroupRow[] = [];
  let inDGroupCount = 0;
  let dgroupLeaderCount = 0;
  const statusCounts = new Map<string, number>();

  for (const member of activeMembers) {
    const metadata = (member.metadata as Record<string, unknown> | null) ?? {};
    const leaderVal = getMetadataStringValue(metadata, PROMOTED_DGROUP_KEYS.leader) ?? null;
    const rawStatusVal = getMetadataStringValue(metadata, PROMOTED_DGROUP_KEYS.status) ?? null;
    const memberSinceVal =
      getMetadataStringValue(metadata, PROMOTED_DGROUP_KEYS.memberSince) ?? null;
    const isLeaderVal = getMetadataStringValue(metadata, PROMOTED_DGROUP_KEYS.isLeader);

    const roleStr = typeof member.role === 'string' ? member.role : '';
    const fullNameNorm = (member.full_name ?? '').trim().toLowerCase();

    const isExplicitMember = Boolean(
      rawStatusVal && ['member', 'dgroup member'].includes(rawStatusVal.toLowerCase().trim()),
    );
    const isLeaderByStatus = Boolean(
      rawStatusVal &&
      ['leader', 'dgroup leader', 'head', 'co-leader'].includes(rawStatusVal.toLowerCase().trim()),
    );
    const isLeaderByFlag = Boolean(
      isLeaderVal && ['yes', 'true', '1', 'leader'].includes(isLeaderVal.toLowerCase().trim()),
    );
    const isLeaderByRole = roleStr.toLowerCase().includes('dgroup leader');
    const isLeaderByRef = fullNameNorm !== '' && referencedLeaders.has(fullNameNorm);

    // If metadata explicitly declares "member", they are strictly a member (never a leader)
    const isDGroupLeader =
      !isExplicitMember && (isLeaderByStatus || isLeaderByFlag || isLeaderByRole || isLeaderByRef);
    const hasDGroup = Boolean(leaderVal || rawStatusVal || memberSinceVal || isDGroupLeader);

    if (hasDGroup) {
      inDGroupCount++;
    }
    if (isDGroupLeader) {
      dgroupLeaderCount++;
    }

    const statusVal = normalizeDGroupStatus(rawStatusVal);
    if (statusVal) {
      statusCounts.set(statusVal, (statusCounts.get(statusVal) ?? 0) + 1);
    }

    dgroupRows.push({
      id: member.id,
      memberId: member.member_id,
      fullName: member.full_name,
      role: extractPrimaryRole(member.role),
      avatarObjectKey: member.avatar_object_key,
      hasDGroup,
      dgroupLeader: leaderVal,
      dgroupStatus: statusVal,
      dgroupMemberSince: memberSinceVal,
      isDGroupLeader,
    });
  }

  const missingDGroupCount = totalActiveMembers - inDGroupCount;
  const coveragePercentage =
    totalActiveMembers > 0 ? Math.round((inDGroupCount / totalActiveMembers) * 1000) / 10 : 0;
  const dgroupMemberCount = Math.max(0, inDGroupCount - dgroupLeaderCount);

  const statusBreakdown: MemberDGroupStatusStat[] = Array.from(statusCounts.entries())
    .map(([status, count]) => ({
      status,
      count,
      percentage: inDGroupCount > 0 ? Math.round((count / inDGroupCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const dgroupAnalytics: MemberDGroupAnalytics = {
    totalMembers: totalActiveMembers,
    inDGroupCount,
    missingDGroupCount,
    coveragePercentage,
    dgroupLeaderCount,
    dgroupMemberCount,
    statusBreakdown,
    members: dgroupRows,
  };

  return {
    totalActiveMembers,
    roleDistributions,
    ageDemographics,
    commitmentHeatmap,
    dgroupAnalytics,
  };
}
