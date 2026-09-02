import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import type { AttendeeSearchResult } from '@/lib/domain/attendance';
import {
  type DynamicFieldRef,
  buildDashboardCheckInsCsvExport,
} from '@/lib/domain/attendance-views';

type ExportDashboardCheckInsButtonProps = {
  eventId: string;
  checkedInAttendees: AttendeeSearchResult[];
  selectedFields: DynamicFieldRef[];
  disabled?: boolean;
};

export function ExportDashboardCheckInsButton({
  eventId,
  checkedInAttendees,
  selectedFields,
  disabled = false,
}: ExportDashboardCheckInsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = () => {
    if (disabled || isExporting) {
      return;
    }

    try {
      setIsExporting(true);
      const { csvText, filename } = buildDashboardCheckInsCsvExport({
        eventId,
        checkedInAttendees,
        selectedFields,
      });

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
      setIsExporting(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export check-ins CSV.';
      toast.error(message);
      setIsExporting(false);
    }
  };

  return (
    <Button variant="primaryOutline" onClick={handleExportCSV} disabled={disabled || isExporting}>
      {isExporting ? 'Exporting...' : 'Export CSV'}
    </Button>
  );
}
