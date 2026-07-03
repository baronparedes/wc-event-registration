import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCancelRegistrationMutation } from '@/hooks/domain/registrations';
import { useErrorWithFadeout } from '@/hooks/utils';
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
  const { showError } = useErrorWithFadeout();

  const handleConfirm = async () => {
    try {
      await cancelMutation.mutateAsync({
        registration_id: registration.id,
        reason: reason || undefined,
      });
      setReason('');
      onClose();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to cancel registration');
    }
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onCancel={onClose}
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
          {reason && (
            <div className="rounded-lg bg-yellow-50 p-3">
              <p className="text-sm font-medium text-yellow-900">Reason provided:</p>
              <p className="mt-1 text-sm text-yellow-800">{reason}</p>
            </div>
          )}
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
