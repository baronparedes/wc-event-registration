import { useState } from 'react';

import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import {
  type ExportCommitmentDashboardStatsCSVParams,
  useExportCommitmentDashboardStatsCSVMutation,
} from '@/hooks/domain/services';

export interface ExportCommitmentDashboardButtonProps {
  filters: ExportCommitmentDashboardStatsCSVParams;
  disabled?: boolean;
}

export function ExportCommitmentDashboardButton({
  filters,
  disabled = false,
}: ExportCommitmentDashboardButtonProps) {
  const exportMutation = useExportCommitmentDashboardStatsCSVMutation();
  const [isExporting, setIsExporting] = useState(false);

  const isDisabled = disabled || isExporting || exportMutation.isPending;

  const handleExport = async () => {
    if (isDisabled) return;

    setIsExporting(true);
    let url: string | null = null;
    let link: HTMLAnchorElement | null = null;

    try {
      const { csvText, filename, totalCount } = await exportMutation.mutateAsync(filters);

      if (totalCount === 0) {
        toast.info('No records found to export.');
        return;
      }

      const blob = new Blob([csvText], { type: 'text/csv; charset=utf-8' });
      url = URL.createObjectURL(blob);
      link = document.createElement('a');

      link.href = url;
      link.download = filename;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();

      toast.success(`Successfully exported ${totalCount} record${totalCount === 1 ? '' : 's'}.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to export commitment dashboard CSV.';
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
      aria-label="Export commitment dashboard as CSV"
    >
      {isExporting || exportMutation.isPending ? (
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
