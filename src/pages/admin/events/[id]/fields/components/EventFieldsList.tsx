import { useState } from 'react'
import { toast } from 'sonner'
import type { AdminEventField } from '@/lib/domain/event-fields'
import type { EventStatus } from '@/lib/domain/events'
import { FIELD_TYPE_LABELS } from '@/lib/domain/event-fields'
import type { EventFieldTypeEnum } from '@/lib/domain/event-fields'
import {
  useDeleteEventFieldMutation,
  useReorderEventFieldsMutation,
} from '@/hooks/domain/event-fields'
import { ActionButton } from '@/components/ui/ActionLink'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable'

type EventFieldsListProps = {
  fields: AdminEventField[]
  eventId: string
  eventStatus: EventStatus
  onEdit: (field: AdminEventField) => void
}

const STATUS_COLORS: Record<string, string> = {
  text: 'bg-blue-100 text-blue-800',
  textarea: 'bg-blue-100 text-blue-800',
  number: 'bg-purple-100 text-purple-800',
  email: 'bg-indigo-100 text-indigo-800',
  phone: 'bg-indigo-100 text-indigo-800',
  select: 'bg-green-100 text-green-800',
  radio: 'bg-green-100 text-green-800',
  checkbox: 'bg-amber-100 text-amber-800',
  multi_select: 'bg-green-100 text-green-800',
  date: 'bg-rose-100 text-rose-800',
  datetime: 'bg-rose-100 text-rose-800',
  boolean: 'bg-amber-100 text-amber-800',
}

/** List of registration form fields with reorder, edit, and delete actions. */
export function EventFieldsList({ fields, eventId, eventStatus, onEdit }: EventFieldsListProps) {
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null)
  const deleteMutation = useDeleteEventFieldMutation()
  const reorderMutation = useReorderEventFieldsMutation()

  const isDraft = eventStatus === 'draft'
  const isLocked = eventStatus === 'published' || eventStatus === 'archived'

  async function handleDelete(fieldId: string, fieldLabel: string) {
    try {
      await deleteMutation.mutateAsync({ fieldId, eventId })
      toast.success(`"${fieldLabel}" removed.`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove field. Please try again.'
      toast.error(message)
    } finally {
      setDeletingFieldId(null)
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= fields.length) return

    const newOrder = [...fields]
    ;[newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]]

    try {
      await reorderMutation.mutateAsync({
        event_id: eventId,
        orderedIds: newOrder.map((f) => f.id),
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to reorder fields. Please try again.'
      toast.error(message)
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
    )
  }

  const deletingField = fields.find((f) => f.id === deletingFieldId)

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
                    {isDraft ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0 || reorderMutation.isPending}
                          aria-label={`Move "${field.label}" up`}
                          title="Move up"
                          className="rounded p-0.5 text-muted hover:bg-muted/20 hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === fields.length - 1 || reorderMutation.isPending}
                          aria-label={`Move "${field.label}" down`}
                          title="Move down"
                          className="rounded p-0.5 text-muted hover:bg-muted/20 hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </>
                    ) : (
                      <span
                        className="cursor-not-allowed text-muted/40"
                        title="Reordering is not available on published or archived events"
                      >
                        ↑↓
                      </span>
                    )}
                    <span className="ml-1 text-xs text-muted">{index + 1}</span>
                  </div>
                </ListTableCell>
                <ListTableCell>
                  <p className="font-medium text-text">{field.label}</p>
                  <p className="text-xs text-muted">{field.field_key}</p>
                </ListTableCell>
                <ListTableCell>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[field.field_type] ?? 'bg-muted text-text'}`}
                  >
                    {FIELD_TYPE_LABELS[field.field_type as EventFieldTypeEnum] ?? field.field_type}
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
          if (deletingField) handleDelete(deletingField.id, deletingField.label)
        }}
        onCancel={() => setDeletingFieldId(null)}
      />
    </>
  )
}
