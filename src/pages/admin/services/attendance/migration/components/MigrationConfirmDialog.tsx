import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface MigrationConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
  previewRowCount: number;
  ignoredRowCount?: number;
}

export function MigrationConfirmDialog({
  isOpen,
  onCancel,
  onConfirm,
  isPending,
  previewRowCount,
  ignoredRowCount = 0,
}: MigrationConfirmDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Migrate Service Attendance"
      description={
        <div className="space-y-2 text-sm text-text-secondary">
          <p>
            This will upsert {previewRowCount} attendance record
            {previewRowCount === 1 ? '' : 's'}. Existing records matching on conflict keys will be
            ignored.
          </p>
          {ignoredRowCount > 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs font-medium text-amber-900">
              Note: {ignoredRowCount} failed record{ignoredRowCount === 1 ? '' : 's'} will be
              ignored and skipped.
            </p>
          )}
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
