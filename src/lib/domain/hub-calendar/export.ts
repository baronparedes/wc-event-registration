import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import { type AdminMember, MEMBER_EXTRA_METADATA_KEYS } from '@/lib/domain/members';

import { getMemberExcusedDetails, toIsoDateKey } from './calendar';
import type { ExcusedMemberMap, MilestoneEntry } from './types';

const TIME_SLOT_CONFIG: Record<TimeSlot, { label: string; order: number }> = {
  '9AM': { label: '9:00 AM', order: 1 },
  '12NN': { label: '12:00 NN', order: 2 },
  '3PM': { label: '3:00 PM', order: 3 },
};

type ScheduleAssignment = {
  slot: TimeSlot;
  member: AdminMember;
};

export function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function toMonthDayKeyFromDateString(value: string | null): string {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return `${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
}

function getMilestoneDate(member: AdminMember, milestoneType: MilestoneEntry['type']): string {
  if (milestoneType === 'birthday') {
    return member.date_of_birth ?? '';
  }

  return member.extra_metadata[MEMBER_EXTRA_METADATA_KEYS.weddingAnniversaryDate] ?? '';
}

function getMilestoneTypeLabel(type: MilestoneEntry['type']): string {
  return type === 'birthday' ? 'Birthday' : 'Wedding Anniversary';
}

export function buildMonthMilestoneCsvExport(params: {
  milestoneEntries: MilestoneEntry[];
  year: number;
  monthIndex: number;
}): { csvText: string; filename: string } {
  const { milestoneEntries, year, monthIndex } = params;

  const sortedEntries = [...milestoneEntries].sort((left, right) => {
    const leftDate = getMilestoneDate(left.member, left.type);
    const rightDate = getMilestoneDate(right.member, right.type);
    const dateSort = toMonthDayKeyFromDateString(leftDate).localeCompare(
      toMonthDayKeyFromDateString(rightDate),
    );

    if (dateSort !== 0) {
      return dateSort;
    }

    const typeSort = left.type.localeCompare(right.type);
    if (typeSort !== 0) {
      return typeSort;
    }

    return left.member.full_name.localeCompare(right.member.full_name);
  });

  const rows: string[][] = [
    [
      'Member ID',
      'Full Name',
      'Nickname',
      'Milestone Type',
      'Milestone Date',
      'Email',
      'Phone',
      'Role',
      'Category',
    ],
    ...sortedEntries.map((entry) => [
      entry.member.member_id,
      entry.member.full_name,
      entry.member.nickname ?? '',
      getMilestoneTypeLabel(entry.type),
      getMilestoneDate(entry.member, entry.type),
      entry.member.email ?? '',
      entry.member.phone ?? '',
      entry.member.role,
      entry.member.category,
    ]),
  ];

  const csvText = rows.map((row) => row.map((value) => escapeCsvValue(value)).join(',')).join('\n');
  const filename = `member-milestones-${year}-${String(monthIndex + 1).padStart(2, '0')}.csv`;

  return { csvText, filename };
}

export function buildSundaySchedulesCsvExport(params: {
  selectedEntries: MemberScheduleEntry[];
  year: number;
  monthIndex: number;
  dayNumber: number;
  excusedMap?: ExcusedMemberMap;
}): { csvText: string; filename: string } {
  const { selectedEntries, year, monthIndex, dayNumber, excusedMap } = params;

  const assignments: ScheduleAssignment[] = [];
  for (const entry of selectedEntries) {
    for (const slot of entry.timeSlots) {
      assignments.push({ slot, member: entry.member });
    }
  }

  assignments.sort((left, right) => {
    const slotDiff =
      (TIME_SLOT_CONFIG[left.slot]?.order ?? 99) - (TIME_SLOT_CONFIG[right.slot]?.order ?? 99);
    if (slotDiff !== 0) {
      return slotDiff;
    }

    return left.member.full_name.localeCompare(right.member.full_name);
  });

  const isoDateKey = toIsoDateKey(year, monthIndex + 1, dayNumber);

  const rows: string[][] = [
    [
      'Time Slot',
      'Member ID',
      'Full Name',
      'Nickname',
      'Role',
      'Category',
      'Email',
      'Phone',
      'Excused',
      'Excused Reason',
    ],
    ...assignments.map((item) => {
      const details = getMemberExcusedDetails(excusedMap, isoDateKey, item.member, item.slot);
      const isExcused = details.isExcused;
      const excusedReason = isExcused ? (details.reason ?? '') : '';

      return [
        TIME_SLOT_CONFIG[item.slot]?.label ?? item.slot,
        item.member.member_id,
        item.member.full_name,
        item.member.nickname ?? '',
        item.member.role,
        item.member.category,
        item.member.email ?? '',
        item.member.phone ?? '',
        isExcused ? 'Yes' : 'No',
        excusedReason,
      ];
    }),
  ];

  const csvText = rows.map((row) => row.map((value) => escapeCsvValue(value)).join(',')).join('\n');
  const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
  const filename = `service-schedules-${dateStr}.csv`;

  return { csvText, filename };
}
