import { Button } from '@/components/ui/Button'

type PanelFooterProps = {
  isFullyLocked: boolean
  isEditing: boolean
  canSave: boolean
  isPending: boolean
  disabledHint: string | null
  onClose: () => void
}

/** Form footer with cancel and save buttons. */
export function PanelFooter({
  isFullyLocked,
  isEditing,
  canSave,
  isPending,
  disabledHint,
  onClose,
}: PanelFooterProps) {
  const showDisabledHint = !canSave && !isFullyLocked && Boolean(disabledHint)

  return (
    <div className="border-t border-border pt-4">
      {showDisabledHint && (
        <p className="mb-2 text-right text-xs text-amber-700" role="status" aria-live="polite">
          {disabledHint}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        {!isFullyLocked && (
          <Button type="submit" variant="default" size="md" disabled={!canSave}>
            {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Field'}
          </Button>
        )}
      </div>
    </div>
  )
}
