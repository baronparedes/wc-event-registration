import { useState } from 'react';

import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCancelRegistrationMutation } from '@/hooks/domain/registrations';
import type { AdminRegistrationWithMember } from '@/lib/domain/registrations';

interface CancelRegistrationDialogProps {
  registration: AdminRegistrationWithMember;
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

export function CancelRegistrationDialog({
  registration,
  isOpen,
  onClose,
  eventId,
}: CancelRegistrationDialogProps) {
  const [reason, setReason] = useState('');
  const cancelMutation = useCancelRegistrationMutation(eventId);

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = async () => {
    const cancellationReason = reason.trim() || undefined;
    try {
      await cancelMutation.mutateAsync({
        registration_id: registration.id,
        reason: cancellationReason,
      });
      handleClose();
    } catch (error) {
      let message = 'Failed to cancel registration';
      if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
    }
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onCancel={handleClose}
      title="Cancel Registration"
      description={
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to cancel this registration for {registration.full_name}? This
            action cannot be undone.
          </p>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-900">{registration.full_name}</p>
            <p className="text-sm text-gray-600">{registration.email}</p>
          </div>
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="cancel-registration-reason"
              className="block text-sm font-medium text-text"
            >
              Cancellation Reason (Optional)
            </label>
            <textarea
              id="cancel-registration-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Requested by attendee, schedule conflict, etc."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      }
      confirmLabel="Cancel Registration"
      confirmLoadingLabel="Cancelling..."
      confirmVariant="destructive"
      onConfirm={handleConfirm}
      isPending={cancelMutation.isPending}
    />
  );
}
