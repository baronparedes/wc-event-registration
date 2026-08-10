import { useState } from 'react';

import { toast } from 'sonner';

import { ActionButton } from '@/components/ui/ActionLink';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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

const FIELD_TYPE_COLORS: Record<string, string> = {
  text: 'bg-blue-100 text-blue-800',
  textarea: 'bg-blue-100 text-blue-800',
  number: 'bg-purple-100 text-purple-800',
  email: 'bg-indigo-100 text-indigo-800',
  phone: 'bg-indigo-100 text-indigo-800',
  select: 'bg-green-100 text-green-800',
  radio: 'bg-green-100 text-green-800',
  checkbox: 'bg-amber-100 text-amber-800',
  multi_select: 'bg-green-100 text-green-800',
  multi_select_toggle: 'bg-green-100 text-green-800',
  date: 'bg-rose-100 text-rose-800',
  datetime: 'bg-rose-100 text-rose-800',
  boolean: 'bg-amber-100 text-amber-800',
};

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
    try {
      await deleteMutation.mutateAsync({ id: fieldId, event_id: eventId });
      toast.success(`"${fieldLabel}" removed.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove field. Please try again.';
      toast.error(message);
    } finally {
      setDeletingFieldId(null);
    }
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

  async function handleToggleActive(field: AttendanceField) {
    try {
      await updateMutation.mutateAsync({
        id: field.id,
        event_id: eventId,
        is_active: !field.is_active,
      });
      const status = field.is_active ? 'deactivated' : 'activated';
      toast.success(`"${field.label}" ${status}.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update field status. Please try again.';
      toast.error(message);
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
                  <div className="flex items-center gap-1">
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        onClick={() => void handleMove(index, 'up')}
                        disabled={index === 0 || reorderMutation.isPending}
                        aria-label={`Move "${field.label}" up`}
                        title="Move up"
                        className="rounded p-0.5 text-muted hover:bg-muted/20 hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleMove(index, 'down')}
                        disabled={index === fields.length - 1 || reorderMutation.isPending}
                        aria-label={`Move "${field.label}" down`}
                        title="Move down"
                        className="rounded p-0.5 text-muted hover:bg-muted/20 hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                    <span className="ml-1 text-xs text-muted">{index + 1}</span>
                  </div>
                </ListTableCell>
                <ListTableCell>
                  <p className="font-medium text-text">{field.label}</p>
                  <p className="text-xs text-muted">{field.field_key}</p>
                </ListTableCell>
                <ListTableCell>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${FIELD_TYPE_COLORS[field.field_type] ?? 'bg-muted text-text'}`}
                  >
                    {ATTENDANCE_FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
                  </span>
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
