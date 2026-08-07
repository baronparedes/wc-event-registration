import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui';
import { type AdminMember, MEMBER_EXTRA_METADATA_KEYS } from '@/lib/domain/members';

import type { MilestoneEntry } from '../';

type ExportMonthMilestonesButtonProps = {
  milestoneEntries: MilestoneEntry[];
  year: number;
  monthIndex: number;
};

function escapeCsvValue(value: string): string {
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

function buildMonthMilestoneCsvExport(params: {
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

export function ExportMonthMilestonesButton({
  milestoneEntries,
  year,
  monthIndex,
}: ExportMonthMilestonesButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const isDisabled = milestoneEntries.length === 0 || isExporting;

  function handleExport() {
    if (isDisabled) {
      return;
    }

    setIsExporting(true);
    let url: string | null = null;
    let link: HTMLAnchorElement | null = null;

    try {
      const { csvText, filename } = buildMonthMilestoneCsvExport({
        milestoneEntries,
        year,
        monthIndex,
      });
      const blob = new Blob([csvText], { type: 'text/csv; charset=utf-8' });
      url = URL.createObjectURL(blob);
      link = document.createElement('a');

      link.href = url;
      link.download = filename;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export milestones CSV.';
      toast.error(message);
    }

    if (link && document.body.contains(link)) {
      document.body.removeChild(link);
    }

    if (url) {
      URL.revokeObjectURL(url);
    }

    setIsExporting(false);
  }

  return (
    <Button type="button" onClick={handleExport} disabled={isDisabled} className="w-full sm:w-auto">
      {isExporting ? 'Exporting...' : 'Export Month Milestones CSV'}
    </Button>
  );
}
