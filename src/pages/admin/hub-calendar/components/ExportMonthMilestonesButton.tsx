import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui';
import { type MilestoneEntry, buildMonthMilestoneCsvExport } from '@/lib/domain/hub-calendar';

type ExportMonthMilestonesButtonProps = {
  milestoneEntries: MilestoneEntry[];
  year: number;
  monthIndex: number;
};

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
