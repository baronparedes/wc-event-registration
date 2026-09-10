import { Button } from '@/components/ui/Button';

type FormFieldPanelFooterProps = {
  isEditing: boolean;
  canSave: boolean;
  isPending: boolean;
  disabledHint: string | null;
  onClose: () => void;
};

/** Form footer with cancel and save buttons. */
export function FormFieldPanelFooter({
  isEditing,
  canSave,
  isPending,
  disabledHint,
  onClose,
}: FormFieldPanelFooterProps) {
  const showDisabledHint = !canSave && Boolean(disabledHint);

  return (
    <div className="border-t border-border pt-4">
      {showDisabledHint && (
        <p className="mb-2 text-right text-xs text-amber-700" role="status" aria-live="polite">
          {disabledHint}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="primaryOutline"
          size="md"
          onClick={onClose}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" variant="default" size="md" disabled={!canSave}>
          {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Field'}
        </Button>
      </div>
    </div>
  );
}
