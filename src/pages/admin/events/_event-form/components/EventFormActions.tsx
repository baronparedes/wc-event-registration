import { Button, Spinner } from '@/components/ui';

type EventFormActionsProps = {
  isPending: boolean;
  isEditMode: boolean;
  onCancel: () => void;
  disabled?: boolean;
  hasChanges?: boolean;
};

export function EventFormActions(props: EventFormActionsProps) {
  const { isPending, isEditMode, onCancel, disabled, hasChanges = true } = props;

  if (disabled) {
    return (
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
        <Button
          onClick={onCancel}
          size="lg"
          type="button"
          variant="primaryOutline"
          className="w-full sm:w-auto"
        >
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
      <Button
        disabled={isPending}
        onClick={onCancel}
        size="lg"
        type="button"
        variant="primaryOutline"
        className="w-full sm:w-auto"
      >
        Cancel
      </Button>
      <Button
        disabled={isPending || !hasChanges}
        size="lg"
        type="submit"
        variant="default"
        className="w-full sm:w-auto"
      >
        {isPending && <Spinner size="sm" className="mr-2" aria-hidden="true" />}
        {isPending ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Event'}
      </Button>
    </div>
  );
}
