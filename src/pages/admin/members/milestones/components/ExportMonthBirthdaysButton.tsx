import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui';
import type { AdminMember } from '@/lib/domain/members';

type ExportMonthBirthdaysButtonProps = {
  members: AdminMember[];
  year: number;
  monthIndex: number;
};

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function buildMonthBirthdayCsvExport(params: {
  members: AdminMember[];
  year: number;
  monthIndex: number;
}): { csvText: string; filename: string } {
  const { members, year, monthIndex } = params;

  const sortedMembers = [...members].sort((left, right) => {
    const leftDate = left.date_of_birth ?? '';
    const rightDate = right.date_of_birth ?? '';
    const dateSort = leftDate.localeCompare(rightDate);

    if (dateSort !== 0) {
      return dateSort;
    }

    return left.full_name.localeCompare(right.full_name);
  });

  const rows: string[][] = [
    ['Member ID', 'Full Name', 'Nickname', 'Birthday', 'Email', 'Phone', 'Role', 'Category'],
    ...sortedMembers.map((member) => [
      member.member_id,
      member.full_name,
      member.nickname ?? '',
      member.date_of_birth ?? '',
      member.email ?? '',
      member.phone ?? '',
      member.role,
      member.category,
    ]),
  ];

  const csvText = rows.map((row) => row.map((value) => escapeCsvValue(value)).join(',')).join('\n');
  const filename = `member-birthdays-${year}-${String(monthIndex + 1).padStart(2, '0')}.csv`;

  return { csvText, filename };
}

export function ExportMonthBirthdaysButton({
  members,
  year,
  monthIndex,
}: ExportMonthBirthdaysButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const isDisabled = members.length === 0 || isExporting;

  async function handleExport() {
    if (isDisabled) {
      return;
    }

    try {
      setIsExporting(true);
      const { csvText, filename } = buildMonthBirthdayCsvExport({ members, year, monthIndex });
      const blob = new Blob([csvText], { type: 'text/csv; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = filename;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export birthdays CSV.';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleExport}
      disabled={isDisabled}
      className="w-full sm:w-auto"
    >
      {isExporting ? 'Exporting...' : 'Export Month Birthdays CSV'}
    </Button>
  );
}
