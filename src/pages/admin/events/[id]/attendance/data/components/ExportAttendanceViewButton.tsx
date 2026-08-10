import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  type AttendeeViewConfig,
  type BuildAttendeeViewResult,
  buildAttendanceViewCsvExport,
} from '@/lib/domain/attendance-views';

type ExportAttendanceViewButtonProps = {
  eventId: string;
  attendanceEnabled: boolean;
  filteredAttendees: BuildAttendeeViewResult['filteredAttendees'];
  groups: BuildAttendeeViewResult['groups'];
  visibleFields: AttendeeViewConfig['visibleFields'];
  disabled?: boolean;
};

export function ExportAttendanceViewButton({
  eventId,
  attendanceEnabled,
  filteredAttendees,
  groups,
  visibleFields,
  disabled = false,
}: ExportAttendanceViewButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    if (disabled || !attendanceEnabled) {
      return;
    }

    try {
      setIsExporting(true);
      const { csvText, filename } = buildAttendanceViewCsvExport({
        eventId,
        filteredAttendees,
        groups,
        visibleFields,
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
    } catch (error) {
      const { toast } = await import('sonner');
      const message = error instanceof Error ? error.message : 'Failed to export attendance CSV.';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExportCSV} disabled={disabled || isExporting}>
      {isExporting ? 'Exporting...' : 'Export Attendance CSV'}
    </Button>
  );
}
