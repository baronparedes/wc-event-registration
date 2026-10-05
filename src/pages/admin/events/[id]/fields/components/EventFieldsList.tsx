import { useState } from 'react';

import { toast } from 'sonner';

import { ActionButton } from '@/components/ui/ActionLink';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FieldOrderControl } from '@/components/ui/FieldOrderControl';
import { FieldTypeBadge } from '@/components/ui/FieldTypeBadge';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import {
  useDeleteEventFieldMutation,
  useReorderEventFieldsMutation,
} from '@/hooks/domain/event-fields';
import type { AdminEventField } from '@/lib/domain/event-fields';
import { EVENT_FIELD_APPLICABILITY_LABELS } from '@/lib/domain/event-fields';
import type { EventStatus } from '@/lib/domain/events';

type EventFieldsListProps = {
  fields: AdminEventField[];
  eventId: string;
  eventStatus: EventStatus;
  onEdit: (field: AdminEventField) => void;
};

/** List of registration form fields with reorder, edit, and delete actions. */
export function EventFieldsList({ fields, eventId, eventStatus, onEdit }: EventFieldsListProps) {
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const deleteMutation = useDeleteEventFieldMutation();
  const reorderMutation = useReorderEventFieldsMutation();

  const isDraft = eventStatus === 'draft';
  const isLocked = eventStatus === 'published' || eventStatus === 'archived';

  async function handleDelete(fieldId: string, fieldLabel: string) {
    try {
      await deleteMutation.mutateAsync({ fieldId, eventId });
      toast.success(`"${fieldLabel}" removed.`);
    } catch (error) {
      let message = 'Failed to remove field. Please try again.';
      if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
    }
    setDeletingFieldId(null);
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= fields.length) return;

    const newOrder = [...fields];
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];

    try {
      await reorderMutation.mutateAsync({
        event_id: eventId,
        orderedIds: newOrder.map((f) => f.id),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to reorder fields. Please try again.';
      toast.error(message);
    }
  }

  if (fields.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">No fields added yet.</p>
        {isDraft && (
          <p className="mt-1 text-xs text-muted">
            Click "Add Field" above to add the first registration form field.
          </p>
        )}
      </div>
    );
  }

  const deletingField = fields.find((f) => f.id === deletingFieldId);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <ListTable density="dense">
          <ListTableHead>
            <ListTableHeaderRow variant="muted">
              <ListTableHeaderCell>Order</ListTableHeaderCell>
              <ListTableHeaderCell>Field Label</ListTableHeaderCell>
              <ListTableHeaderCell>Type</ListTableHeaderCell>
              <ListTableHeaderCell>Registrant Type</ListTableHeaderCell>
              <ListTableHeaderCell>Required</ListTableHeaderCell>
              <ListTableHeaderCell>Active</ListTableHeaderCell>
              <ListTableHeaderCell className="text-right">Actions</ListTableHeaderCell>
            </ListTableHeaderRow>
          </ListTableHead>
          <ListTableBody>
            {fields.map((field, index) => (
              <ListTableRow key={field.id} hover="muted">
                <ListTableCell>
                  <FieldOrderControl
                    index={index}
                    total={fields.length}
                    isReorderable={isDraft}
                    disabled={reorderMutation.isPending}
                    onMove={handleMove}
                    disabledTooltip="Reordering is not available on published or archived events"
                    itemLabel={field.label}
                  />
                </ListTableCell>
                <ListTableCell>
                  <p className="font-medium text-text">{field.label}</p>
                  <p className="text-xs text-muted">{field.field_key}</p>
                </ListTableCell>
                <ListTableCell>
                  <FieldTypeBadge fieldType={field.field_type} />
                </ListTableCell>
                <ListTableCell>
                  <span className="text-xs font-medium text-text">
                    {EVENT_FIELD_APPLICABILITY_LABELS[field.applicability]}
                  </span>
                </ListTableCell>
                <ListTableCell>
                  <span
                    className={`text-xs font-medium ${field.is_required ? 'text-text' : 'text-muted'}`}
                  >
                    {field.is_required ? 'Yes' : 'No'}
                  </span>
                </ListTableCell>
                <ListTableCell>
                  <span
                    className={`text-xs font-medium ${field.is_active ? 'text-green-700' : 'text-muted'}`}
                  >
                    {field.is_active ? 'Active' : 'Hidden'}
                  </span>
                </ListTableCell>
                <ListTableCell className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <ActionButton type="button" onClick={() => onEdit(field)}>
                      Edit
                    </ActionButton>
                    {isDraft ? (
                      <ActionButton
                        type="button"
                        variant="destructive"
                        onClick={() => setDeletingFieldId(field.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </ActionButton>
                    ) : (
                      <span
                        className="cursor-not-allowed text-xs text-muted/50"
                        title={
                          isLocked
                            ? 'Cannot delete fields on published or archived events'
                            : undefined
                        }
                      >
                        Delete
                      </span>
                    )}
                  </div>
                </ListTableCell>
              </ListTableRow>
            ))}
          </ListTableBody>
        </ListTable>
      </div>

      <ConfirmDialog
        isOpen={deletingFieldId !== null}
        title="Delete Field"
        description={
          deletingField
            ? `Remove "${deletingField.label}" from this event's registration form? This cannot be undone.`
            : 'Remove this field?'
        }
        confirmLabel="Delete Field"
        confirmLoadingLabel="Deleting..."
        confirmVariant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingField) handleDelete(deletingField.id, deletingField.label);
        }}
        onCancel={() => setDeletingFieldId(null)}
      />
    </>
  );
}
