import type { MemberScheduleEntry } from '@/hooks/domain/members';

export type RoleMemberItem = {
  entry: MemberScheduleEntry;
  secondaryRole: string | null;
};

export type PrimaryRoleSection = {
  primaryRole: string;
  totalCount: number;
  members: RoleMemberItem[];
};

export function parseMemberRole(rawRole?: string | null): {
  primaryRole: string;
  secondaryRole: string | null;
} {
  if (!rawRole || !rawRole.trim()) {
    return { primaryRole: 'General Volunteer', secondaryRole: null };
  }
  const trimmed = rawRole.trim();
  const parts = trimmed.split(/\s*[/,]\s*/).filter(Boolean);
  if (parts.length > 1) {
    return {
      primaryRole: parts[0],
      secondaryRole: parts.slice(1).join(' / '),
    };
  }
  return {
    primaryRole: parts[0] || 'General Volunteer',
    secondaryRole: null,
  };
}

export function groupEntriesByPrimaryRole(entries: MemberScheduleEntry[]): PrimaryRoleSection[] {
  const map = new Map<string, RoleMemberItem[]>();

  for (const entry of entries) {
    const { primaryRole, secondaryRole } = parseMemberRole(entry.member.role);
    if (!map.has(primaryRole)) {
      map.set(primaryRole, []);
    }
    map.get(primaryRole)!.push({ entry, secondaryRole });
  }

  const result: PrimaryRoleSection[] = [];
  for (const [primaryRole, members] of map.entries()) {
    members.sort((a, b) => {
      if (!a.secondaryRole && b.secondaryRole) return -1;
      if (a.secondaryRole && !b.secondaryRole) return 1;
      return a.entry.member.full_name.localeCompare(b.entry.member.full_name);
    });

    result.push({
      primaryRole,
      totalCount: members.length,
      members,
    });
  }

  return result.sort((a, b) => a.primaryRole.localeCompare(b.primaryRole));
}
