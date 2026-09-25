import { useRef, useState } from 'react';

import { IdCardLanyard } from 'lucide-react';
import { toast } from 'sonner';

import { AlertBanner } from '@/components/ui';
import { ActionButton } from '@/components/ui/ActionLink';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useUpdateMemberIdMutation } from '@/hooks/domain/members';
import { useRfidAutoFocus } from '@/hooks/utils';

interface UpdateMemberIdDialogProps {
  memberId: string;
  memberName: string;
  currentMemberId: string;
  triggerClassName?: string;
}

export function UpdateMemberIdDialog({
  memberId,
  memberName,
  currentMemberId,
  triggerClassName,
}: UpdateMemberIdDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const updateMutation = useUpdateMemberIdMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');

  const trimmedNewId = newMemberId.trim();
  const hasChanges = trimmedNewId && trimmedNewId !== currentMemberId;
  const isUpdating = updateMutation.isPending;

  useRfidAutoFocus(inputRef, isOpen);

  function handleClose() {
    setNewMemberId('');
    setIsOpen(false);
  }

  function handleOpen() {
    setIsOpen(true);
  }

  async function handleConfirm() {
    if (!trimmedNewId) return;

    try {
      await updateMutation.mutateAsync({
        id: memberId,
        newMemberId: trimmedNewId,
      });
      toast.success(`Member ID updated to "${trimmedNewId}".`);
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update Member ID.');
    }
  }

  return (
    <>
      <ActionButton
        type="button"
        onClick={handleOpen}
        title="Update Member ID"
        aria-label="Update Member ID"
        className={triggerClassName}
      >
        <IdCardLanyard className="h-5 w-5" />
      </ActionButton>

      <Dialog isOpen={isOpen} onClose={handleClose} size="md">
        <Dialog.Header showCloseButton>
          <Dialog.Title>Update Member ID</Dialog.Title>
          <Dialog.Description>
            Enter the new Member ID. This action will update the member&apos;s lookup ID.
          </Dialog.Description>
        </Dialog.Header>

        <Dialog.Body className="space-y-4">
          <AlertBanner
            variant="warning"
            description={
              <div>
                <p className="font-semibold text-amber-900">Member: {memberName}</p>
                <p className="font-semibold text-amber-900">Current Member ID: {currentMemberId}</p>
                <p className="mt-1 text-xs text-amber-700">
                  This ID is used for lookup and registration linking. Update with caution.
                </p>
              </div>
            }
          />

          <div className="space-y-1.5">
            <label htmlFor="new-member-id" className="block text-sm font-semibold text-text">
              New Member ID
            </label>
            <input
              ref={inputRef}
              id="new-member-id"
              placeholder="Scan or type new member ID"
              disabled={isUpdating}
              autoComplete="off"
              type="text"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.currentTarget.value)}
              className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm leading-6 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600"
            />
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button
            type="button"
            variant="primaryOutline"
            onClick={handleClose}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!hasChanges || isUpdating}>
            {isUpdating ? 'Updating...' : 'Confirm Update'}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </>
  );
}
