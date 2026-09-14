import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui';
import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import type { AdminMember } from '@/lib/domain/members';

const TIME_SLOT_CONFIG: Record<TimeSlot, { label: string; order: number }> = {
  '9AM': { label: '9:00 AM', order: 1 },
  '12NN': { label: '12:00 NN', order: 2 },
  '3PM': { label: '3:00 PM', order: 3 },
};

type ScheduleAssignment = {
  slot: TimeSlot;
  member: AdminMember;
};

type ExportSundaySchedulesButtonProps = {
  selectedEntries: MemberScheduleEntry[];
  year: number;
  monthIndex: number;
  dayNumber: number;
};

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function buildSundaySchedulesCsvExport(params: {
  selectedEntries: MemberScheduleEntry[];
  year: number;
  monthIndex: number;
  dayNumber: number;
}): { csvText: string; filename: string } {
  const { selectedEntries, year, monthIndex, dayNumber } = params;

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

  const rows: string[][] = [
    ['Time Slot', 'Member ID', 'Full Name', 'Nickname', 'Role', 'Category', 'Email', 'Phone'],
    ...assignments.map((item) => [
      TIME_SLOT_CONFIG[item.slot]?.label ?? item.slot,
      item.member.member_id,
      item.member.full_name,
      item.member.nickname ?? '',
      item.member.role,
      item.member.category,
      item.member.email ?? '',
      item.member.phone ?? '',
    ]),
  ];

  const csvText = rows.map((row) => row.map((value) => escapeCsvValue(value)).join(',')).join('\n');
  const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
  const filename = `service-schedules-${dateStr}.csv`;

  return { csvText, filename };
}

export function ExportSundaySchedulesButton({
  selectedEntries,
  year,
  monthIndex,
  dayNumber,
}: ExportSundaySchedulesButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const isDisabled = selectedEntries.length === 0 || isExporting;

  function handleExport() {
    if (isDisabled) {
      return;
    }

    setIsExporting(true);
    let url: string | null = null;
    let link: HTMLAnchorElement | null = null;

    try {
      const { csvText, filename } = buildSundaySchedulesCsvExport({
        selectedEntries,
        year,
        monthIndex,
        dayNumber,
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
      const message =
        error instanceof Error ? error.message : 'Failed to export service schedules CSV.';
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
    <Button
      type="button"
      variant="primaryOutline"
      size="sm"
      onClick={handleExport}
      disabled={isDisabled}
    >
      {isExporting ? 'Exporting...' : 'Export Schedules CSV'}
    </Button>
  );
}
