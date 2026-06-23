import { useParams } from 'react-router-dom'
import { useAdminEventQuery } from '@/hooks/domain/events'
import { useAdminRegistrationsQuery } from '@/hooks/domain/registrations'
import { RegistrationsList, ExportButton } from './components'
import { SectionCard } from '@/components/ui/SectionCard'

export function AdminRegistrationsPage() {
  const { id: eventId } = useParams<{ id: string }>()

  const eventQuery = useAdminEventQuery(eventId ?? '')
  const registrationsQuery = useAdminRegistrationsQuery(eventId ?? '')

  if (!eventId) {
    return <div>Invalid event ID</div>
  }

  const isLoading = eventQuery.isLoading || registrationsQuery.isLoading
  const error = eventQuery.error || registrationsQuery.error

  if (error) {
    return (
      <section className="space-y-4">
        <h1 className="font-heading text-3xl font-bold text-text">Event Registrations</h1>
        <SectionCard title="Error">
          <p className="text-sm text-red-600">Error loading registrations: {String(error)}</p>
        </SectionCard>
      </section>
    )
  }

  const event = eventQuery.data
  const registrations = registrationsQuery.data ?? []
  const isEventArchived = event?.status === 'archived'

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text">
            Registrations for {event?.title ?? 'Event'}
          </h1>
          <p className="mt-1 text-sm text-muted">{registrations.length} total registrations</p>
        </div>
        <ExportButton eventId={eventId} />
      </div>

      {event && event.status !== 'draft' && (
        <div
          className={`rounded-lg p-3 ${
            event.status === 'archived'
              ? 'border border-yellow-200 bg-yellow-50'
              : 'border border-blue-200 bg-blue-50'
          }`}
        >
          <p
            className={`text-sm font-medium ${
              event.status === 'archived' ? 'text-yellow-800' : 'text-blue-800'
            }`}
          >
            {event.status === 'archived'
              ? '🔒 This event is archived. Registrations cannot be cancelled.'
              : '📋 This event is published. All registrations are visible.'}
          </p>
        </div>
      )}

      <SectionCard title="Registrations">
        <RegistrationsList
          registrations={registrations}
          isLoading={isLoading}
          eventId={eventId}
          isEventArchived={isEventArchived}
        />
      </SectionCard>
    </section>
  )
}
