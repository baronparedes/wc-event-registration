import { useState } from 'react';

import { toast } from 'sonner';

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

function downloadCsv(csvText: string, filename: string) {
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
}

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

    setIsExporting(true);
    try {
      const { csvText, filename } = buildAttendanceViewCsvExport({
        eventId,
        filteredAttendees,
        groups,
        visibleFields,
      });

      downloadCsv(csvText, filename);
    } catch (error) {
      let message = 'Failed to export attendance CSV.';
      if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
    }
    setIsExporting(false);
  };

  return (
    <Button variant="primaryOutline" onClick={handleExportCSV} disabled={disabled || isExporting}>
      {isExporting ? 'Exporting...' : 'Export Attendance CSV'}
    </Button>
  );
}
