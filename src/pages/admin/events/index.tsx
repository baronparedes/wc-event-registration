import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  useAdminEventsQuery,
  usePublishEventMutation,
  useArchiveEventMutation,
} from '@/hooks/domain/events'
import { formatDateOnly } from '@/lib/dateFormat'
import { ActionLink } from '@/components/ui/ActionLink'
import { ActionConfirmButton } from '@/components/ui/ActionConfirmButton'
import { Button } from '@/components/ui/Button'
import { EventStatusBadge, PublishActionButton, DuplicatePolicyLabel } from './components'

export function AdminEventsPage() {
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([])

  const eventsQuery = useAdminEventsQuery({ pageSize: 20, cursor })
  const events = eventsQuery.data?.items ?? []
  const hasMore = eventsQuery.data?.hasMore ?? false
  const nextCursor = eventsQuery.data?.nextCursor ?? null
  const currentPage = useMemo(() => cursorHistory.length + 1, [cursorHistory.length])

  const isLoading = eventsQuery.isLoading
  const error = eventsQuery.error
  const publishMutation = usePublishEventMutation()
  const archiveMutation = useArchiveEventMutation()

  async function handlePublish(eventId: string, eventTitle: string) {
    try {
      await publishMutation.mutateAsync(eventId)
      toast.success(`"${eventTitle}" has been published.`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to publish event. Please try again.'
      toast.error(message)
    }
  }

  async function handleArchive(eventId: string, eventTitle: string) {
    try {
      await archiveMutation.mutateAsync(eventId)
      toast.success(`"${eventTitle}" has been archived.`)
    } catch {
      toast.error('Failed to archive event. Please try again.')
    }
  }

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

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text">Events</h1>
          <p className="text-sm text-muted">
            Create, edit, archive, and manage registration behavior.
          </p>
          <p className="mt-1 text-xs text-muted">Page {currentPage}</p>
        </div>
        <Button asChild size="md" variant="default">
          <Link to="/admin/events/new">New Event</Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-surface">
        {isLoading ? (
          <p className="p-6 text-sm text-muted">Loading events...</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">Failed to load events. Please refresh.</p>
        ) : events.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            No events yet.{' '}
            <Link className="text-primary underline underline-offset-2" to="/admin/events/new">
              Create your first event.
            </Link>
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-6 py-3">Event</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Duplicate Policy</th>
                    <th className="px-4 py-3">Reg. Mode</th>
                    <th className="px-4 py-3">Starts</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.map((event) => (
                    <tr key={event.id} className="transition hover:bg-background/50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-text">{event.title}</p>
                        <p className="mt-0.5 text-xs text-muted">{event.slug}</p>
                      </td>
                      <td className="px-4 py-4">
                        <EventStatusBadge status={event.status} />
                      </td>
                      <td className="px-4 py-4">
                        <DuplicatePolicyLabel policy={event.duplicate_policy} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm capitalize text-text">
                          {event.registration_mode}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-text">{formatDateOnly(event.starts_at)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <ActionLink to={`/admin/events/${event.id}`}>Edit</ActionLink>
                          <ActionLink to={`/admin/events/${event.id}/fields`}>Fields</ActionLink>
                          <ActionLink to={`/admin/events/${event.id}/registrations`}>
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
                                  Archived events are no longer visible to the public. You can
                                  publish the event again to restore it.
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-border px-6 py-3">
              <p className="text-xs text-muted">Showing up to 20 events per page</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={cursorHistory.length === 0 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasMore || !nextCursor || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
