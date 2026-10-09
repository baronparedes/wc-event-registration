import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';

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
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 [&>button]:w-full sm:[&>button]:w-auto">
        <Button onClick={onCancel} size="lg" type="button" variant="primaryOutline">
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 [&>button]:w-full sm:[&>button]:w-auto">
      <Button
        disabled={isPending}
        onClick={onCancel}
        size="lg"
        type="button"
        variant="primaryOutline"
      >
        Cancel
      </Button>
      <Button disabled={isPending || !hasChanges} size="lg" type="submit" variant="default">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Event'}
      </Button>
    </div>
  );
}
