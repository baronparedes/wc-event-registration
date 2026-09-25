import { DuplicateEntityDialog } from '@/components/ui';
import type { AdminForm } from '@/lib/domain/forms';

export type DuplicateFormDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  form: AdminForm | null;
  isPending: boolean;
  onDuplicate: (formId: string, title: string, slug: string) => Promise<void>;
};

export function DuplicateFormDialog({
  isOpen,
  onClose,
  form,
  isPending,
  onDuplicate,
}: DuplicateFormDialogProps) {
  return (
    <DuplicateEntityDialog
      isOpen={isOpen}
      onClose={onClose}
      entityType="form"
      sourceItem={form}
      isPending={isPending}
      onDuplicate={onDuplicate}
    />
  );
}
