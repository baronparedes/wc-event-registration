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
import { Switch } from '@/components/ui/Switch';
import {
  useDeleteAttendanceFieldMutation,
  useReorderAttendanceFieldsMutation,
  useUpdateAttendanceFieldMutation,
} from '@/hooks/domain/attendance-fields';
import { ATTENDANCE_FIELD_TYPE_LABELS } from '@/lib/domain/attendance-fields';
import type { AttendanceField } from '@/lib/domain/attendance-fields';

type AttendanceFieldsListProps = {
  fields: AttendanceField[];
  eventId: string;
  onEdit: (field: AttendanceField) => void;
};

/** List of attendance fields with reorder, edit, and delete actions. */
export function AttendanceFieldsList({ fields, eventId, onEdit }: AttendanceFieldsListProps) {
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const deleteMutation = useDeleteAttendanceFieldMutation();
  const reorderMutation = useReorderAttendanceFieldsMutation();
  const updateMutation = useUpdateAttendanceFieldMutation();

  async function handleDelete(fieldId: string, fieldLabel: string) {
    const result = await deleteMutation
      .mutateAsync({ id: fieldId, event_id: eventId })
      .catch((error: unknown) => {
        let message = 'Failed to remove field. Please try again.';
        if (error instanceof Error) {
          message = error.message;
        }
        toast.error(message);
        return null;
      });

    if (result !== null) {
      toast.success(`"${fieldLabel}" removed.`);
    }
    setDeletingFieldId(null);
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= fields.length) return;

    const newOrder = [...fields];
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];

    await reorderMutation
      .mutateAsync({
        event_id: eventId,
        orderedIds: newOrder.map((f) => f.id),
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Failed to reorder fields. Please try again.';
        toast.error(message);
        return null;
      });
  }

  async function handleToggleActive(field: AttendanceField) {
    const result = await updateMutation
      .mutateAsync({
        id: field.id,
        event_id: eventId,
        is_active: !field.is_active,
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to update field status. Please try again.';
        toast.error(message);
        return null;
      });

    if (result !== null) {
      const status = field.is_active ? 'deactivated' : 'activated';
      toast.success(`"${field.label}" ${status}.`);
    }
  }

  const fieldToDelete = deletingFieldId ? fields.find((f) => f.id === deletingFieldId) : null;

  if (fields.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background px-6 py-10 text-center">
        <p className="text-sm font-medium text-muted">No attendance fields configured yet.</p>
        <p className="mt-1 text-xs text-muted">Add a field to start collecting attendance data.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <ListTable density="dense">
          <ListTableHead>
            <ListTableHeaderRow variant="muted">
              <ListTableHeaderCell>Order</ListTableHeaderCell>
              <ListTableHeaderCell>Field Label</ListTableHeaderCell>
              <ListTableHeaderCell>Type</ListTableHeaderCell>
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
                    isReorderable={true}
                    disabled={reorderMutation.isPending}
                    onMove={handleMove}
                    itemLabel={field.label}
                  />
                </ListTableCell>
                <ListTableCell>
                  <p className="font-medium text-text">{field.label}</p>
                  <p className="text-xs text-muted">{field.field_key}</p>
                </ListTableCell>
                <ListTableCell>
                  <FieldTypeBadge
                    fieldType={field.field_type}
                    customLabel={ATTENDANCE_FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
                  />
                </ListTableCell>
                <ListTableCell>
                  <span
                    className={`text-xs font-medium ${field.is_required ? 'text-text' : 'text-muted'}`}
                  >
                    {field.is_required ? 'Yes' : 'No'}
                  </span>
                </ListTableCell>
                <ListTableCell className="align-middle py-2">
                  <Switch
                    checked={field.is_active}
                    onCheckedChange={() => void handleToggleActive(field)}
                    disabled={updateMutation.isPending}
                    size="sm"
                    showStateText
                    onText="Active"
                    offText="Inactive"
                    ariaLabel={`Toggle "${field.label}" ${field.is_active ? 'inactive' : 'active'}`}
                    title={field.is_active ? 'Click to deactivate' : 'Click to activate'}
                  />
                </ListTableCell>
                <ListTableCell className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <ActionButton type="button" onClick={() => onEdit(field)}>
                      Edit
                    </ActionButton>
                    <ActionButton
                      type="button"
                      variant="destructive"
                      onClick={() => setDeletingFieldId(field.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </ActionButton>
                  </div>
                </ListTableCell>
              </ListTableRow>
            ))}
          </ListTableBody>
        </ListTable>
      </div>

      {fieldToDelete && (
        <ConfirmDialog
          isOpen={Boolean(deletingFieldId)}
          title="Delete Attendance Field"
          description={`Are you sure you want to delete "${fieldToDelete.label}"? All collected data for this field will also be removed.`}
          confirmLabel="Delete"
          confirmLoadingLabel="Deleting…"
          confirmVariant="destructive"
          isPending={deleteMutation.isPending}
          onConfirm={() => void handleDelete(fieldToDelete.id, fieldToDelete.label)}
          onCancel={() => setDeletingFieldId(null)}
        />
      )}
    </>
  );
}
