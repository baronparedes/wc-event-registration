import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAdminEventQuery } from '@/hooks/domain/events'
import { useAdminRegistrationsQuery } from '@/hooks/domain/registrations'
import { RegistrationsList, ExportButton } from './components'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'

const PAGE_SIZE_OPTIONS = [10, 25, 50]

export function AdminRegistrationsPage() {
  const { id: eventId } = useParams<{ id: string }>()

  const [pageSize, setPageSize] = useState<number>(25)
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([])

  const eventQuery = useAdminEventQuery(eventId ?? '')
  const registrationsQuery = useAdminRegistrationsQuery(eventId ?? '', { pageSize, cursor })

  if (!eventId) {
    return <div>Invalid event ID</div>
  }

  const pagedResult = registrationsQuery.data
  const registrations = pagedResult?.items ?? []
  const hasMore = pagedResult?.hasMore ?? false
  const nextCursor = pagedResult?.nextCursor ?? null
  const currentPage = cursorHistory.length + 1

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
  const isEventArchived = event?.status === 'archived'

  function handleNextPage() {
    if (!nextCursor) return
    setCursorHistory((prev) => [...prev, cursor])
    setCursor(nextCursor)
  }

  function handlePreviousPage() {
    setCursorHistory((prev) => {
      if (prev.length === 0) return prev
      const nextHistory = [...prev]
      const previousCursor = nextHistory.pop() ?? null
      setCursor(previousCursor)
      return nextHistory
    })
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize)
    setCursor(null)
    setCursorHistory([])
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text">
            Registrations for {event?.title ?? 'Event'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Page {currentPage} • {registrations.length} registrations on this page
          </p>
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
              ? 'This event is archived. Registrations cannot be cancelled.'
              : 'This event is published. All registrations are visible.'}
          </p>
        </div>
      )}

      <SectionCard title="Registrations">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>Rows per page</span>
            <div className="flex items-center gap-1">
              {PAGE_SIZE_OPTIONS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={pageSize === option ? 'default' : 'outline'}
                  onClick={() => handlePageSizeChange(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePreviousPage}
              disabled={cursorHistory.length === 0 || isLoading}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleNextPage}
              disabled={!hasMore || !nextCursor || isLoading}
            >
              Next
            </Button>
          </div>
        </div>

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
