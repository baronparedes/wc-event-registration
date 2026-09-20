import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface MigrationConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
  previewRowCount: number;
}

export function MigrationConfirmDialog({
  isOpen,
  onCancel,
  onConfirm,
  isPending,
  previewRowCount,
}: MigrationConfirmDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Migrate Service Attendance"
      description={
        <div className="space-y-2">
          <p>
            This will upsert {previewRowCount} attendance record
            {previewRowCount === 1 ? '' : 's'}. Existing records matching on conflict keys will be
            ignored.
          </p>
          <p>Continue?</p>
        </div>
      }
      confirmLabel="Confirm Migration"
      confirmLoadingLabel="Migrating..."
      confirmVariant="default"
      isPending={isPending}
      disabled={previewRowCount === 0}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
