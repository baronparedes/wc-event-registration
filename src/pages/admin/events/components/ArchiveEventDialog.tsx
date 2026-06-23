import { useArchiveEventMutation } from '../../../../hooks/admin'
import { Button } from '../../../../components/ui/Button'
import { toast } from 'sonner'

type ArchiveEventDialogProps = {
  eventId: string
  eventTitle: string
  onClose: () => void
}

export function ArchiveEventDialog({ eventId, eventTitle, onClose }: ArchiveEventDialogProps) {
  const archiveMutation = useArchiveEventMutation()

  async function handleConfirm() {
    try {
      await archiveMutation.mutateAsync(eventId)
      toast.success(`"${eventTitle}" has been archived.`)
      onClose()
    } catch {
      toast.error('Failed to archive event. Please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading text-lg font-semibold text-text">Archive Event</h2>
        <p className="mt-2 text-sm text-muted">
          Are you sure you want to archive{' '}
          <span className="font-medium text-text">"{eventTitle}"</span>? Archived events are no
          longer visible to the public. You can publish the event again to restore it.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button
            disabled={archiveMutation.isPending}
            onClick={onClose}
            size="md"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={archiveMutation.isPending}
            onClick={handleConfirm}
            size="md"
            type="button"
            variant="destructive"
          >
            {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
          </Button>
        </div>
      </div>
    </div>
  )
}
