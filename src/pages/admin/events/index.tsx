import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminEventsQuery } from '../../../hooks/admin'
import type { AdminEvent } from '../../../lib/admin/types'
import { ActionButton, ActionLink } from '../../../components/ui/ActionLink'
import { Button } from '../../../components/ui/Button'
import { ArchiveEventDialog, EventStatusBadge } from './components'

function formatDate(isoString: string | null): string {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function DuplicatePolicyLabel({ policy }: { policy: AdminEvent['duplicate_policy'] }) {
  return (
    <span className="text-sm text-text">
      {policy === 'allow_update' ? 'Allow Update' : 'Block'}
    </span>
  )
}

export function AdminEventsPage() {
  const { data: events, isLoading, error } = useAdminEventsQuery()
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; title: string } | null>(null)

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text">Events</h1>
          <p className="text-sm text-muted">
            Create, edit, archive, and manage registration behavior.
          </p>
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
        ) : !events || events.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            No events yet.{' '}
            <Link className="text-primary underline underline-offset-2" to="/admin/events/new">
              Create your first event.
            </Link>
          </p>
        ) : (
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
                      <span className="text-sm text-text">{formatDate(event.starts_at)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <ActionLink to={`/admin/events/${event.id}`}>Edit</ActionLink>
                        <ActionLink to={`/admin/events/${event.id}/fields`}>Fields</ActionLink>
                        {event.status !== 'archived' && (
                          <ActionButton
                            onClick={() => setArchiveTarget({ id: event.id, title: event.title })}
                            type="button"
                            variant="destructive"
                          >
                            Archive
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {archiveTarget && (
        <ArchiveEventDialog
          eventId={archiveTarget.id}
          eventTitle={archiveTarget.title}
          onClose={() => setArchiveTarget(null)}
        />
      )}
    </section>
  )
}
