import { Button } from '@/components/ui/Button';
import { useExportRegistrationsCSVMutation } from '@/hooks/domain/registrations';
import { useErrorWithFadeout } from '@/hooks/utils';

interface ExportButtonProps {
  eventId: string;
  disabled?: boolean;
}

function downloadCsv(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/csv; charset=utf-8' });
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

export function ExportButton({ eventId, disabled = false }: ExportButtonProps) {
  const exportMutation = useExportRegistrationsCSVMutation(eventId);
  const { showError } = useErrorWithFadeout();

  const handleExport = async () => {
    if (disabled) {
      return;
    }

    const fallbackFilename = `event-${eventId}-registrations.csv`;
    try {
      const { text, filename } = await exportMutation.mutateAsync();
      downloadCsv(text, filename || fallbackFilename);
    } catch (error) {
      let message = 'Export failed';
      if (error instanceof Error) {
        message = error.message;
      }
      showError(message);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || exportMutation.isPending}
      variant="primaryOutline"
    >
      {exportMutation.isPending ? 'Exporting...' : 'Export as CSV'}
    </Button>
  );
}
