import { Button } from '../../../../components/ui/Button'

type EventFormActionsProps = {
  isPending: boolean
  isEditMode: boolean
  onCancel: () => void
}

export function EventFormActions(props: EventFormActionsProps) {
  const { isPending, isEditMode, onCancel } = props

  return (
    <div className="flex justify-end gap-3">
      <Button disabled={isPending} onClick={onCancel} size="lg" type="button" variant="outline">
        Cancel
      </Button>
      <Button disabled={isPending} size="lg" type="submit" variant="default">
        {isPending ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Event'}
      </Button>
    </div>
  )
}
