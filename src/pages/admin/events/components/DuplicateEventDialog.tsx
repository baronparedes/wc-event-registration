import { DuplicateEntityDialog } from '@/components/ui';
import type { AdminEvent } from '@/lib/domain/events';

export type DuplicateEventDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  event: AdminEvent | null;
  isPending: boolean;
  onDuplicate: (eventId: string, title: string, slug: string) => Promise<void>;
};

export function DuplicateEventDialog({
  isOpen,
  onClose,
  event,
  isPending,
  onDuplicate,
}: DuplicateEventDialogProps) {
  return (
    <DuplicateEntityDialog
      isOpen={isOpen}
      onClose={onClose}
      entityType="event"
      sourceItem={event}
      isPending={isPending}
      onDuplicate={onDuplicate}
    />
  );
}
