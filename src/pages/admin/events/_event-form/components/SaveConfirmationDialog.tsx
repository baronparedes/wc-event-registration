import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { CreateEventInput } from '@/lib/domain/events';

type SaveConfirmationDialogProps = {
  isOpen: boolean;
  changedFieldNames: (keyof CreateEventInput)[];
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Shows what fields are being changed when saving a published event.
 * Helps prevent accidental modifications to live events.
 */
export function SaveConfirmationDialog({
  isOpen,
  changedFieldNames,
  isPending,
  onConfirm,
  onCancel,
}: SaveConfirmationDialogProps) {
  if (!isOpen || changedFieldNames.length === 0) {
    return null;
  }

  const fieldLabels: Record<keyof CreateEventInput, string> = {
    title: 'Event Title',
    slug: 'Custom URL',
    description: 'Description',
    location: 'Location',
    starts_at: 'Event Starts',
    ends_at: 'Event Ends',
    registration_opens_at: 'Registration Opens',
    registration_closes_at: 'Registration Closes',
    status: 'Status',
    registration_mode: 'Registration Status',
    duplicate_policy: 'Re-registration Policy',
    allow_name_lookup: 'Allow Name Lookup',
    allow_public_registrations: 'Allow Public Registrations',
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Review Changes"
      description={
        <div className="space-y-3">
          <div className="text-sm text-muted">You're updating the following fields:</div>
          <ul className="space-y-2">
            {changedFieldNames.map((field) => (
              <li key={field} className="flex items-start gap-2 text-sm">
                <span className="text-primary">•</span>
                <span className="text-text">{fieldLabels[field]}</span>
              </li>
            ))}
          </ul>
        </div>
      }
      confirmLabel="Save Changes"
      confirmLoadingLabel="Saving..."
      isPending={isPending}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
