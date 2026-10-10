import { useState } from 'react';

import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Spinner } from '@/components/ui';
import { type ServiceAttendance, buildServiceAttendanceCsvExport } from '@/lib/domain/services';

export interface ExportServiceAttendanceButtonProps {
  records: ServiceAttendance[];
  startDate?: string;
  endDate?: string;
  disabled?: boolean;
}

export function ExportServiceAttendanceButton({
  records,
  startDate,
  endDate,
  disabled = false,
}: ExportServiceAttendanceButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const isDisabled = disabled || isExporting || records.length === 0;

  const handleExport = () => {
    if (isDisabled) return;

    setIsExporting(true);
    let url: string | null = null;
    let link: HTMLAnchorElement | null = null;
    let exportFailed = false;
    let exportError: unknown;

    try {
      const { csvText, filename } = buildServiceAttendanceCsvExport({
        records,
        startDate,
        endDate,
      });

      const blob = new Blob([csvText], { type: 'text/csv; charset=utf-8' });
      url = URL.createObjectURL(blob);
      link = document.createElement('a');

      link.href = url;
      link.download = filename;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();

      let recordLabel = 'records';
      if (records.length === 1) recordLabel = 'record';
      toast.success(`Successfully exported ${records.length} ${recordLabel}.`);
    } catch (error) {
      exportFailed = true;
      exportError = error;
    }

    if (exportFailed) {
      let message = 'Failed to export service attendance CSV.';
      if (exportError instanceof Error) message = exportError.message;
      toast.error(message);
    }

    if (link && document.body.contains(link)) {
      document.body.removeChild(link);
    }
    if (url) URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  return (
    <Button
      type="button"
      variant="primaryOutline"
      size="sm"
      onClick={handleExport}
      disabled={isDisabled}
      aria-label="Export service attendance as CSV"
    >
      {isExporting ? (
        <>
          <Spinner size="sm" className="mr-2" aria-hidden="true" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Export as CSV
        </>
      )}
    </Button>
  );
}
