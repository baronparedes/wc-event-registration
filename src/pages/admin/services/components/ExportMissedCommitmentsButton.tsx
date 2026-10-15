import { useState } from 'react';

import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Spinner } from '@/components/ui';
import {
  type MissedServiceCommitment,
  buildMissedServiceCommitmentsCsvExport,
} from '@/lib/domain/services';

export interface ExportMissedCommitmentsButtonProps {
  records: MissedServiceCommitment[];
  startDate?: string;
  endDate?: string;
  disabled?: boolean;
  className?: string;
}

export function ExportMissedCommitmentsButton({
  records,
  startDate,
  endDate,
  disabled = false,
  className,
}: ExportMissedCommitmentsButtonProps) {
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
      const { csvText, filename } = buildMissedServiceCommitmentsCsvExport({
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

      const label = records.length === 1 ? 'record' : 'records';
      toast.success(`Successfully exported ${records.length} missed commitment ${label}.`);
    } catch (error) {
      exportFailed = true;
      exportError = error;
    }

    if (exportFailed) {
      let message = 'Failed to export missed commitments CSV.';
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
      size="sm"
      onClick={handleExport}
      disabled={isDisabled}
      aria-label="Export missed commitments as CSV"
      className={`w-full sm:w-auto ${className ?? ''}`.trim()}
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
