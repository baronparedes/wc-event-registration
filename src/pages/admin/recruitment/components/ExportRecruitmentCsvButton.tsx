import { useState } from 'react';

import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Spinner } from '@/components/ui';
import {
  type RecruitmentApplicationStatus,
  buildRecruitmentCsvExport,
  fetchAdminRecruitmentApplicationsForExport,
} from '@/lib/domain/recruitment';

interface ExportRecruitmentCsvButtonProps {
  searchTerm?: string;
  status?: RecruitmentApplicationStatus;
  currentStep?: number;
  role?: string;
  disabled?: boolean;
}

export function ExportRecruitmentCsvButton({
  searchTerm,
  status,
  currentStep,
  role,
  disabled = false,
}: ExportRecruitmentCsvButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (disabled || isExporting) return;

    setIsExporting(true);
    let url: string | null = null;
    let link: HTMLAnchorElement | null = null;

    try {
      const records = await fetchAdminRecruitmentApplicationsForExport({
        searchTerm,
        status,
        currentStep,
        role,
      });

      if (records.length === 0) {
        toast.info('No recruitment applications to export.');
        setIsExporting(false);
        return;
      }

      const { csvText, filename } = buildRecruitmentCsvExport(records);
      const blob = new Blob([csvText], { type: 'text/csv; charset=utf-8' });
      url = URL.createObjectURL(blob);
      link = document.createElement('a');

      link.href = url;
      link.download = filename;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();

      const countLabel = records.length === 1 ? '1 application' : `${records.length} applications`;
      toast.success(`Successfully exported ${countLabel} to CSV.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to export recruitment applications CSV.';
      toast.error(message);
    } finally {
      if (link && document.body.contains(link)) {
        document.body.removeChild(link);
      }
      if (url) URL.revokeObjectURL(url);
      setIsExporting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="primaryOutline"
      onClick={handleExport}
      disabled={disabled || isExporting}
      className="w-full sm:w-auto"
    >
      {isExporting ? (
        <>
          <Spinner size="sm" className="mr-2" aria-hidden="true" />
          Exporting CSV...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Export CSV
        </>
      )}
    </Button>
  );
}
