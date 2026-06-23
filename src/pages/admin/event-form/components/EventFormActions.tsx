import { Button } from '../../../../components/ui/Button'

type EventFormActionsProps = {
  isPending: boolean
  isEditMode: boolean
  onCancel: () => void
  disabled?: boolean
  hasChanges?: boolean
}

export function EventFormActions(props: EventFormActionsProps) {
  const { isPending, isEditMode, onCancel, disabled, hasChanges = true } = props

  if (disabled) {
    return (
      <div className="flex justify-end gap-3">
        <Button onClick={onCancel} size="lg" type="button" variant="outline">
          Back to Events
        </Button>
      </div>
    )
  }

  return (
    <div className="flex justify-end gap-3">
      <Button disabled={isPending} onClick={onCancel} size="lg" type="button" variant="outline">
        Cancel
      </Button>
      <Button disabled={isPending || !hasChanges} size="lg" type="submit" variant="default">
        {isPending ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Event'}
      </Button>
    </div>
  )
}
