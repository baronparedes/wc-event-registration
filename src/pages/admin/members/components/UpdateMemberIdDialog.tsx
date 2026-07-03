import { useRef, useState } from 'react';

import { toast } from 'sonner';

import { ActionButton } from '@/components/ui/ActionLink';
import { Button } from '@/components/ui/Button';
import { useUpdateMemberIdMutation } from '@/hooks/domain/members';
import { useRfidAutoFocus } from '@/hooks/utils';

interface UpdateMemberIdDialogProps {
  memberId: string;
  memberName: string;
  currentMemberId: string;
}

export function UpdateMemberIdDialog({
  memberId,
  memberName,
  currentMemberId,
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
      <ActionButton type="button" onClick={handleOpen}>
        Update Member ID
      </ActionButton>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={handleClose}
        >
          <div
            className="mx-4 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading text-lg font-semibold text-text">Update Member ID</h2>
            <p className="mt-2 text-sm text-muted">
              Enter the new Member ID. This action will update the member's lookup ID.
            </p>

            <div className="mt-4 space-y-4">
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-semibold">Member: {memberName}</p>
                <p className="font-semibold">Current Member ID: {currentMemberId}</p>
                <p className="mt-1 text-xs text-amber-700">
                  This ID is used for lookup and registration linking. Update with caution.
                </p>
              </div>

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
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isUpdating}>
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={!hasChanges || isUpdating}>
                {isUpdating ? 'Updating...' : 'Confirm Update'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
