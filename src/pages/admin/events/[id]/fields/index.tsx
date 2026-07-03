import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AdminPageShell } from '@/components/layout'
import { ROUTE_PATHS, toAdminEventDetail } from '@/config/constants'
import { useAdminEventQuery } from '@/hooks/domain/events'
import { useAdminEventFieldsQuery } from '@/hooks/domain/event-fields'
import type { AdminEventField } from '@/lib/domain/event-fields'
import { ActionLink } from '@/components/ui/ActionLink'
import { Button } from '@/components/ui/Button'
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
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          { label: event?.title ?? 'Event', to: id ? toAdminEventDetail(id) : undefined },
          { label: 'Fields' },
        ]}
        navLinks={
          id ? <ActionLink to={toAdminEventDetail(id)}>Back to Event</ActionLink> : undefined
        }
        title="Registration Fields"
        description={
          event
            ? `Manage the registration form fields for ${event.title}`
            : 'Manage registration form fields'
        }
        actions={
          <Button
            type="button"
            variant="default"
            onClick={openCreate}
            disabled={!isDraft}
            title={!isDraft ? 'Only draft events can add new fields.' : undefined}
          >
            Add Field
          </Button>
        }
      />

      {!isDraft && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">
            {isPublished ? 'Published event' : 'Archived event'}
          </p>
          <p className="mt-1 text-xs text-blue-700">
            {isPublished
              ? 'You can edit field labels and help text only. To change field types, options, or validation rules, archive this event and create a new one.'
              : 'Field edits are disabled on archived events.'}
          </p>
        </div>
      )}

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading fields...">
        {!event ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
            Event not found.{' '}
            <Link className="underline" to={ROUTE_PATHS.adminEvents}>
              Back to events
            </Link>
          </div>
        ) : (
          <>
            <EventFieldsList
              fields={fields ?? []}
              eventId={id ?? ''}
              eventStatus={event.status}
              onEdit={openEdit}
            />

            {panelState.mode !== 'closed' && id && (
              <EventFieldEditPanel
                eventId={id}
                eventStatus={event.status}
                field={panelField}
                onClose={closePanel}
              />
            )}
          </>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  )
}
