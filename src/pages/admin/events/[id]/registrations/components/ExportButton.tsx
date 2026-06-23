import { Button } from '@/components/ui/Button'
import { useExportRegistrationsCSVMutation } from '@/hooks/domain/registrations'
import { useErrorWithFadeout } from '@/hooks/utils'

interface ExportButtonProps {
  eventId: string
}

export function ExportButton({ eventId }: ExportButtonProps) {
  const exportMutation = useExportRegistrationsCSVMutation(eventId)
  const { showError } = useErrorWithFadeout()

  const handleExport = async () => {
    try {
      const csvContent = await exportMutation.mutateAsync()
      const blob = new Blob([csvContent], { type: 'text/csv; charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `event-${eventId}-registrations.csv`
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Export failed')
    }
  }

  return (
    <Button onClick={handleExport} disabled={exportMutation.isPending} variant="outline">
      {exportMutation.isPending ? 'Exporting...' : 'Export as CSV'}
    </Button>
  )
}
