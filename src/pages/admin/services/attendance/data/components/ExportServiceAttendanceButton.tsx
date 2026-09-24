import { useState } from 'react';

import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
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

      toast.success(
        `Successfully exported ${records.length} record${records.length === 1 ? '' : 's'}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to export service attendance CSV.';
      toast.error(message);
    } finally {
      if (link && document.body.contains(link)) {
        document.body.removeChild(link);
      }
      if (url) {
        URL.revokeObjectURL(url);
      }
      setIsExporting(false);
    }
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
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
