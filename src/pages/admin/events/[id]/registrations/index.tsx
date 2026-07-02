import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  PAGINATION_DEFAULTS,
  PAGINATION_OPTIONS,
  TIMING,
  toAdminEventPublicRegistrations,
} from '@/config/constants'
import { useAdminEventQuery } from '@/hooks/domain/events'
import { useAdminRegistrationsQuery } from '@/hooks/domain/registrations'
import { getCurrentPageFromCursor, getPageCursor } from '@/lib/infrastructure'
import { AdminPaginationControls } from '@/components/ui/AdminPaginationControls'
import { Button } from '@/components/ui/Button'
import { CopyNamesButton, ExportButton, RegistrationsList } from './components'

export function AdminRegistrationsPage() {
  const { id: eventId } = useParams<{ id: string }>()

  const [pageSize, setPageSize] = useState<number>(PAGINATION_DEFAULTS.adminRegistrationsPageSize)
  const [cursor, setCursor] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const normalizedSearchTerm = useMemo(() => debouncedSearchTerm.trim(), [debouncedSearchTerm])

  const navigate = useNavigate()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, TIMING.searchDebounceMs)
    return () => {
      window.clearTimeout(timer)
    }
  }, [searchTerm])

  const eventQuery = useAdminEventQuery(eventId ?? '')
  const registrationsQuery = useAdminRegistrationsQuery(eventId ?? '', {
    pageSize,
    cursor,
    searchTerm: normalizedSearchTerm,
  })

  if (!eventId) {
    return <div>Invalid event ID</div>
  }

  const pagedResult = registrationsQuery.data
  const registrations = pagedResult?.items ?? []
  const hasMore = pagedResult?.hasMore ?? false
  const nextCursor = pagedResult?.nextCursor ?? null
  const totalPages = pagedResult?.totalPages ?? 1
  const currentPage = getCurrentPageFromCursor(cursor, pageSize)

  const isLoading = eventQuery.isLoading || registrationsQuery.isLoading
  const error = eventQuery.error || registrationsQuery.error

  if (error) {
    return (
      <section className="space-y-4">
        <h1 className="font-heading text-3xl font-bold text-text">Event Registrations</h1>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm text-red-600">Error loading registrations: {String(error)}</p>
        </div>
      </section>
    )
  }

  const event = eventQuery.data
  const isEventArchived = event?.status === 'archived'

  function handleSearchTermChange(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm)
    setCursor(null)
  }

  function handleNextPage() {
    if (!nextCursor) return
    setCursor(nextCursor)
  }

  function handlePreviousPage() {
    setCursor(getPageCursor(currentPage - 1, pageSize))
  }

  function handleFirstPage() {
    setCursor(null)
  }

  function handleGoToPage(page: number) {
    setCursor(getPageCursor(page, pageSize))
  }

  function handleLastPage() {
    setCursor(getPageCursor(totalPages, pageSize))
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize)
    setCursor(null)
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-bold text-text">
            Registrations for {event?.title ?? 'Event'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Page {currentPage} of {totalPages} • {registrations.length} member registrations on this
            page
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end">
          <Button
            asChild
            variant="outline"
            size="sm"
            onClick={() => navigate(toAdminEventPublicRegistrations(eventId))}
          >
            View Public Registrations
          </Button>
          <CopyNamesButton eventId={eventId} eventTitle={event?.title} />
          <ExportButton eventId={eventId} />
        </div>
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

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="flex w-full flex-col gap-1 text-sm text-muted sm:max-w-md">
            Search registrations
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => handleSearchTermChange(event.target.value)}
              placeholder="Search by name, member ID, or email"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSearchTermChange('')}
            disabled={normalizedSearchTerm.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface">
        <RegistrationsList
          registrations={registrations}
          isLoading={isLoading}
          eventId={eventId}
          isEventArchived={isEventArchived}
          searchTerm={normalizedSearchTerm}
        />

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="hidden text-xs text-muted sm:block">
            {normalizedSearchTerm.length > 0
              ? `Showing up to ${pageSize} matching registrations per page`
              : `Showing up to ${pageSize} registrations per page`}
          </p>
          <AdminPaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            isLoading={isLoading}
            canGoPrevious={currentPage > 1}
            canGoNext={hasMore && Boolean(nextCursor)}
            pageSize={pageSize}
            pageSizeOptions={PAGINATION_OPTIONS.adminRegistrations}
            onPageSizeChange={handlePageSizeChange}
            onFirstPage={handleFirstPage}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
            onLastPage={handleLastPage}
            onGoToPage={handleGoToPage}
          />
        </div>
      </div>
    </section>
  )
}
