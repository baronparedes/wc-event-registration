import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import {
  PAGINATION_DEFAULTS,
  PAGINATION_OPTIONS,
  ROUTE_PATHS,
  TIMING,
  TOAST_MESSAGES,
  UI_MESSAGES,
  toAdminEventAttendance,
  toAdminEventDetail,
  toAdminEventFields,
  toAdminEventRegistrations,
} from '@/config/constants'
import {
  useAdminEventsQuery,
  usePublishEventMutation,
  useArchiveEventMutation,
} from '@/hooks/domain/events'
import { formatDateOnly, getCurrentPageFromCursor, getPageCursor } from '@/lib/infrastructure'
import { AdminPageShell } from '@/components/layout'
import { ActionLink } from '@/components/ui/ActionLink'
import { ActionConfirmButton } from '@/components/ui/ActionConfirmButton'
import { AdminPaginationControls } from '@/components/ui/AdminPaginationControls'
import { Button, EmptyState } from '@/components/ui'
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable'
import { EventStatusBadge, PublishActionButton, DuplicatePolicyLabel } from './components'

export function AdminEventsPage() {
  const navigate = useNavigate()
  const [pageSize, setPageSize] = useState<number>(PAGINATION_DEFAULTS.adminEventsPageSize)
  const [cursor, setCursor] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const normalizedSearchTerm = useMemo(() => debouncedSearchTerm.trim(), [debouncedSearchTerm])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, TIMING.searchDebounceMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [searchTerm])

  const eventsQuery = useAdminEventsQuery({ pageSize, cursor, searchTerm: normalizedSearchTerm })
  const events = eventsQuery.data?.items ?? []
  const hasMore = eventsQuery.data?.hasMore ?? false
  const nextCursor = eventsQuery.data?.nextCursor ?? null
  const totalPages = eventsQuery.data?.totalPages ?? 1
  const currentPage = getCurrentPageFromCursor(cursor, pageSize)

  const isLoading = eventsQuery.isLoading
  const error = eventsQuery.error
  const publishMutation = usePublishEventMutation()
  const archiveMutation = useArchiveEventMutation()

  async function handlePublish(eventId: string, eventTitle: string) {
    try {
      await publishMutation.mutateAsync(eventId)
      toast.success(TOAST_MESSAGES.eventSaved.published(eventTitle))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : TOAST_MESSAGES.eventSaved.publishFailed
      toast.error(message)
    }
  }

  async function handleArchive(eventId: string, eventTitle: string) {
    try {
      await archiveMutation.mutateAsync(eventId)
      toast.success(TOAST_MESSAGES.eventSaved.archived(eventTitle))
    } catch {
      toast.error(TOAST_MESSAGES.eventSaved.archiveFailed)
    }
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

  function handleSearchTermChange(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm)
    setCursor(null)
  }

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[{ label: 'Events' }]}
        title="Manage Events"
        description="Create, edit, archive, and manage registration behavior."
        actions={
          <Button
            size="md"
            variant="default"
            onClick={() => navigate(ROUTE_PATHS.adminEventNew)}
            className="w-full sm:w-auto sm:inline-flex"
          >
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        }
      />

      <AdminPageShell.Filters>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="flex w-full flex-col gap-1 text-sm text-muted sm:max-w-md">
            Search events
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => handleSearchTermChange(event.target.value)}
              placeholder="Search by event title or slug"
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
      </AdminPageShell.Filters>

      <AdminPageShell.Content isLoading={isLoading} loadingMessage={UI_MESSAGES.loading.events}>
        {error && (
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-red-600">{UI_MESSAGES.errors.eventsLoadFailed}</p>
          </div>
        )}

        {!error && events.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12">
            <EmptyState
              icon={<Plus className="h-6 w-6" />}
              title="No events yet"
              description="Create your first event to get started with registrations."
              action={
                <Button asChild size="md" variant="default">
                  <Link to={ROUTE_PATHS.adminEventNew}>Create Event</Link>
                </Button>
              }
            />
          </div>
        )}

        {!error && events.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface">
            <ListTable>
              <ListTableHead>
                <ListTableHeaderRow>
                  <ListTableHeaderCell className="px-6">Event</ListTableHeaderCell>
                  <ListTableHeaderCell>Status</ListTableHeaderCell>
                  <ListTableHeaderCell>Duplicate Policy</ListTableHeaderCell>
                  <ListTableHeaderCell>Reg. Mode</ListTableHeaderCell>
                  <ListTableHeaderCell>Starts</ListTableHeaderCell>
                  <ListTableHeaderCell>Actions</ListTableHeaderCell>
                </ListTableHeaderRow>
              </ListTableHead>
              <ListTableBody>
                {events.map((event) => (
                  <ListTableRow
                    key={event.id}
                    className="cursor-pointer"
                    onClick={() => navigate(toAdminEventDetail(event.id))}
                  >
                    <ListTableCell className="px-6">
                      <p className="font-medium text-text">{event.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{event.slug}</p>
                    </ListTableCell>
                    <ListTableCell>
                      <EventStatusBadge status={event.status} />
                    </ListTableCell>
                    <ListTableCell>
                      <DuplicatePolicyLabel policy={event.duplicate_policy} />
                    </ListTableCell>
                    <ListTableCell>
                      <span className="text-sm capitalize text-text">
                        {event.registration_mode}
                      </span>
                    </ListTableCell>
                    <ListTableCell>
                      <span className="text-sm text-text">{formatDateOnly(event.starts_at)}</span>
                    </ListTableCell>
                    <ListTableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        <ActionLink to={toAdminEventDetail(event.id)}>Edit</ActionLink>
                        <ActionLink to={toAdminEventAttendance(event.id)}>Attendance</ActionLink>
                        <ActionLink to={toAdminEventFields(event.id)}>Fields</ActionLink>
                        <ActionLink to={toAdminEventRegistrations(event.id)}>
                          Registrations
                        </ActionLink>
                        {event.status === 'draft' && (
                          <PublishActionButton
                            event={event}
                            isPending={publishMutation.isPending}
                            onPublish={handlePublish}
                          />
                        )}
                        {event.status !== 'archived' && (
                          <ActionConfirmButton
                            variant="destructive"
                            title="Archive Event"
                            description={
                              <>
                                Are you sure you want to archive{' '}
                                <span className="font-medium text-text">"{event.title}"</span>?
                                Archived events are no longer visible to the public. You can publish
                                the event again to restore it.
                              </>
                            }
                            confirmLabel="Archive"
                            confirmLoadingLabel="Archiving..."
                            isPending={archiveMutation.isPending}
                            onConfirm={() => handleArchive(event.id, event.title)}
                          >
                            Archive
                          </ActionConfirmButton>
                        )}
                      </div>
                    </ListTableCell>
                  </ListTableRow>
                ))}
              </ListTableBody>
            </ListTable>

            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="hidden text-xs text-muted sm:block">
                {normalizedSearchTerm.length > 0
                  ? `Showing up to ${pageSize} matching events per page`
                  : `Showing up to ${pageSize} events per page`}
              </p>
              <AdminPaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                isLoading={isLoading}
                canGoPrevious={currentPage > 1}
                canGoNext={hasMore && Boolean(nextCursor)}
                pageSize={pageSize}
                pageSizeOptions={PAGINATION_OPTIONS.adminEvents}
                onPageSizeChange={handlePageSizeChange}
                onFirstPage={handleFirstPage}
                onPreviousPage={handlePreviousPage}
                onNextPage={handleNextPage}
                onLastPage={handleLastPage}
                onGoToPage={handleGoToPage}
              />
            </div>
          </div>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  )
}
