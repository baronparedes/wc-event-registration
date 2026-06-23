import { Button } from '@/components/ui/Button'

type PanelFooterProps = {
  isFullyLocked: boolean
  isEditing: boolean
  canSave: boolean
  isPending: boolean
  onClose: () => void
}

/** Form footer with cancel and save buttons. */
export function PanelFooter({
  isFullyLocked,
  isEditing,
  canSave,
  isPending,
  onClose,
}: PanelFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
      <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isPending}>
        Cancel
      </Button>
      {!isFullyLocked && (
        <Button type="submit" variant="default" size="md" disabled={!canSave}>
          {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Field'}
        </Button>
      )}
    </div>
  )
}
