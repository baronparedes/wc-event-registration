import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type MemberLifecycleActionsProps = {
  isDeletedMember: boolean;
  memberFullName: string;
  isDeleting: boolean;
  isRestoring: boolean;
  onDeleteMember: () => Promise<void>;
  onRestoreMember: () => Promise<void>;
};

/**
 * Renders delete/restore actions and owns the confirm dialog open/close state.
 * Parent component provides the actual mutation handlers.
 */
export function MemberLifecycleActions({
  isDeletedMember,
  memberFullName,
  isDeleting,
  isRestoring,
  onDeleteMember,
  onRestoreMember,
}: MemberLifecycleActionsProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);

  async function handleConfirmDelete() {
    await onDeleteMember();
    setIsDeleteConfirmOpen(false);
  }

  async function handleConfirmRestore() {
    await onRestoreMember();
    setIsRestoreConfirmOpen(false);
  }

  return (
    <>
      {isDeletedMember ? (
        <Button
          type="button"
          variant="default"
          onClick={() => setIsRestoreConfirmOpen(true)}
          disabled={isRestoring}
        >
          Restore Member
        </Button>
      ) : (
        <Button
          type="button"
          variant="destructive"
          onClick={() => setIsDeleteConfirmOpen(true)}
          disabled={isDeleting}
        >
          Delete Member
        </Button>
      )}

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete Member"
        description={
          <>
            Are you sure you want to delete <span className="font-medium">"{memberFullName}"</span>?
            This performs a soft delete and removes this member from registration lookup.
          </>
        }
        confirmLabel="Delete"
        confirmLoadingLabel="Deleting..."
        confirmVariant="destructive"
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={isRestoreConfirmOpen}
        title="Restore Member"
        description={
          <>
            Restore <span className="font-medium">"{memberFullName}"</span>? This will make the
            member available again in registration lookup.
          </>
        }
        confirmLabel="Restore"
        confirmLoadingLabel="Restoring..."
        confirmVariant="default"
        isPending={isRestoring}
        onConfirm={handleConfirmRestore}
        onCancel={() => setIsRestoreConfirmOpen(false)}
      />
    </>
  );
}
