import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui';
import type { MemberScheduleEntry } from '@/hooks/domain/members';
import { buildSundaySchedulesCsvExport } from '@/lib/domain/hub-calendar';

type ExportSundaySchedulesButtonProps = {
  selectedEntries: MemberScheduleEntry[];
  year: number;
  monthIndex: number;
  dayNumber: number;
};

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
    <Button type="button" size="sm" onClick={handleExport} disabled={isDisabled}>
      {isExporting ? 'Exporting...' : 'Export Schedules CSV'}
    </Button>
  );
}
