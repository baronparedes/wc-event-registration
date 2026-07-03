import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ROUTE_PATHS, toAdminEventDetail } from '@/config/constants'
import { useAdminEventQuery } from '@/hooks/domain/events'
import { useAdminEventFieldsQuery } from '@/hooks/domain/event-fields'
import type { AdminEventField } from '@/lib/domain/event-fields'
import { Button } from '@/components/ui/Button'
import { ActionLink } from '@/components/ui/ActionLink'
import { EventFieldsList, EventFieldEditPanel } from './components'

type PanelState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; field: AdminEventField }

export function AdminEventFieldsPage() {
  const { id } = useParams<{ id: string }>()
  const { data: event, isLoading: eventLoading } = useAdminEventQuery(id)
  const { data: fields, isLoading: fieldsLoading } = useAdminEventFieldsQuery(id)
  const [panelState, setPanelState] = useState<PanelState>({ mode: 'closed' })

  const isLoading = eventLoading || fieldsLoading
  const isDraft = event?.status === 'draft'
  const isPublished = event?.status === 'published'
  const isArchived = event?.status === 'archived'
  const panelField: AdminEventField | null = panelState.mode === 'edit' ? panelState.field : null

  function openCreate() {
    setPanelState({ mode: 'create' })
  }

  function openEdit(field: AdminEventField) {
    setPanelState({ mode: 'edit', field })
  }

  function closePanel() {
    setPanelState({ mode: 'closed' })
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-muted">
          <Link to={ROUTE_PATHS.adminEvents} className="hover:underline">
            Events
          </Link>
          <span>›</span>
          <Link
            to={id ? toAdminEventDetail(id) : ROUTE_PATHS.adminEvents}
            className="hover:underline"
          >
            {event?.title ?? 'Event'}
          </Link>
          <span>›</span>
          <span>Fields</span>
        </div>
        {id && <ActionLink to={toAdminEventDetail(id)}>Back to Event</ActionLink>}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-bold text-text">Registration Fields</h1>
          {event && (
            <p className="mt-1 text-sm text-muted">
              Manage the registration form fields for{' '}
              <span className="font-medium text-text">{event.title}</span>
            </p>
          )}
        </div>
        <div className="flex w-full flex-col items-start gap-1 md:w-auto md:items-end">
          <Button
            type="button"
            variant="default"
            className="w-full md:w-auto"
            onClick={openCreate}
            disabled={!isDraft}
            title={!isDraft ? 'Only draft events can add new fields.' : undefined}
          >
            Add Field
          </Button>
          {!isDraft && (
            <p className="text-right text-xs text-amber-700">Only draft events can add fields.</p>
          )}
        </div>
      </div>

      {/* Status banners */}
      {isPublished && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">Published event</p>
          <p className="mt-1 text-xs text-blue-700">
            You can edit field labels and help text only. To change field types, options, or
            validation rules, archive this event and create a new one.
          </p>
        </div>
      )}
      {isArchived && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Archived event</p>
          <p className="mt-1 text-xs text-amber-700">
            Field edits are disabled on archived events.
          </p>
        </div>
      )}

      {/* Fields list */}
      {isLoading ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
          Loading fields...
        </div>
      ) : !event ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
          Event not found.{' '}
          <Link className="underline" to={ROUTE_PATHS.adminEvents}>
            Back to events
          </Link>
        </div>
      ) : (
        <EventFieldsList
          fields={fields ?? []}
          eventId={id ?? ''}
          eventStatus={event.status}
          onEdit={openEdit}
        />
      )}

      {/* Edit / create panel */}
      {panelState.mode !== 'closed' && event && id && (
        <EventFieldEditPanel
          eventId={id}
          eventStatus={event.status}
          field={panelField}
          onClose={closePanel}
        />
      )}
    </section>
  )
}
