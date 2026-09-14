import { type AdminMember, MEMBER_EXTRA_METADATA_KEYS } from '@/lib/domain/members';

import type { MilestoneEntry, MilestoneType } from '../types';
import { toMonthDayKey } from './calendarUtils';

const MILESTONE_SOURCE_DATES: Record<MilestoneType, (member: AdminMember) => string | null> = {
  birthday: (member) => member.date_of_birth,
  wedding_anniversary: (member) =>
    (member.extra_metadata[MEMBER_EXTRA_METADATA_KEYS.weddingAnniversaryDate] as string) ?? null,
};

export function parseMonthDay(value: string | null): { month: number; day: number } | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
}

export function buildMilestoneEntries(members: AdminMember[]): MilestoneEntry[] {
  return members.flatMap((member) =>
    (
      Object.entries(MILESTONE_SOURCE_DATES) as [
        MilestoneType,
        (member: AdminMember) => string | null,
      ][]
    ).flatMap(([type, sourceDate]) => {
      const parsed = parseMonthDay(sourceDate(member));
      if (!parsed) return [];
      return [
        {
          id: `${member.id}-${type}`,
          type,
          member,
        },
      ];
    }),
  );
}

export function getMonthDayKeyFromMember(member: AdminMember, type: MilestoneType): string | null {
  const sourceDate = MILESTONE_SOURCE_DATES[type]?.(member) ?? null;
  const parsed = parseMonthDay(sourceDate);
  return parsed ? toMonthDayKey(parsed.month, parsed.day) : null;
}
