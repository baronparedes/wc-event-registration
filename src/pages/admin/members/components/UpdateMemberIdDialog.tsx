import { useRef, useState } from 'react';

import { IdCardLanyard } from 'lucide-react';
import { toast } from 'sonner';

import { AlertBanner, FormInputField } from '@/components/ui';
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

          <FormInputField
            inputRef={inputRef}
            id="new-member-id"
            label="New Member ID"
            placeholder="Scan or type new member ID"
            disabled={isUpdating}
            autoComplete="off"
            value={newMemberId}
            onChange={(e) => setNewMemberId(e.target.value)}
          />
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
