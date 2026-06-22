import { Link } from 'react-router-dom'

export function AdminEventsPage() {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text">Events</h1>
          <p className="text-sm text-muted">
            Create, edit, archive, and manage registration behavior.
          </p>
        </div>
        <Link
          className="rounded-md bg-primary px-4 py-2 font-medium text-white transition hover:bg-primary/90"
          to="/admin/events/new"
        >
          New Event
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">
          Placeholder table: this will become a TanStack Table with filters and status badges.
        </p>
      </div>
    </section>
  )
}
