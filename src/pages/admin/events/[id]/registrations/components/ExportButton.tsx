import { Button } from '@/components/ui/Button';
import { useExportRegistrationsCSVMutation } from '@/hooks/domain/registrations';
import { useErrorWithFadeout } from '@/hooks/utils';

interface ExportButtonProps {
  eventId: string;
  disabled?: boolean;
}

export function ExportButton({ eventId, disabled = false }: ExportButtonProps) {
  const exportMutation = useExportRegistrationsCSVMutation(eventId);
  const { showError } = useErrorWithFadeout();

  const handleExport = async () => {
    if (disabled) {
      return;
    }

    try {
      const { text, filename } = await exportMutation.mutateAsync();
      const blob = new Blob([text], { type: 'text/csv; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename ?? `event-${eventId}-registrations.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Export failed');
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
