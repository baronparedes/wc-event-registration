import { Link } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  PAGINATION_DEFAULTS,
  PAGINATION_OPTIONS,
  ROUTE_PATHS,
  TOAST_MESSAGES,
  UI_MESSAGES,
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
import { ActionLink } from '@/components/ui/ActionLink'
import { ActionConfirmButton } from '@/components/ui/ActionConfirmButton'
import { AdminPaginationControls } from '@/components/ui/AdminPaginationControls'
import { Button } from '@/components/ui/Button'
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
  const [pageSize, setPageSize] = useState<number>(PAGINATION_DEFAULTS.adminEventsPageSize)
  const [cursor, setCursor] = useState<string | null>(null)

  const eventsQuery = useAdminEventsQuery({ pageSize, cursor })
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

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text">Events</h1>
          <p className="text-sm text-muted">
            Create, edit, archive, and manage registration behavior.
          </p>
          <p className="mt-1 text-xs text-muted">
            Page {currentPage} of {totalPages}
          </p>
        </div>
        <Button asChild size="md" variant="default">
          <Link to={ROUTE_PATHS.adminEventNew}>New Event</Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-surface">
        {isLoading ? (
          <p className="p-6 text-sm text-muted">{UI_MESSAGES.loading.events}</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">{UI_MESSAGES.errors.eventsLoadFailed}</p>
        ) : events.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            {UI_MESSAGES.empty.noEventsYet}{' '}
            <Link
              className="text-primary underline underline-offset-2"
              to={ROUTE_PATHS.adminEventNew}
            >
              Create your first event.
            </Link>
          </p>
        ) : (
          <>
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
                  <ListTableRow key={event.id}>
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
                    <ListTableCell>
                      <div className="flex items-center gap-3">
                        <ActionLink to={toAdminEventDetail(event.id)}>Edit</ActionLink>
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
                Showing up to {pageSize} events per page
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
          </>
        )}
      </div>
    </section>
  )
}
