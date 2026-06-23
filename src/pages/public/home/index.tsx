import { Link } from 'react-router-dom'
import { usePublicEventListingQuery } from '../../../hooks/event-registration'
import type { PublicEventListingItem } from '../../../lib/event-registration'
import { Button } from '../../../components/ui/Button'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function EventCard({ event }: { event: PublicEventListingItem }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-text">{event.title}</h3>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            event.listingStatus === 'open'
              ? 'bg-primary/10 text-primary'
              : event.listingStatus === 'upcoming'
                ? 'bg-secondary/10 text-secondary'
                : 'bg-muted/30 text-muted'
          }`}
        >
          {event.listingStatus === 'open'
            ? 'Open'
            : event.listingStatus === 'upcoming'
              ? 'Upcoming'
              : 'Past'}
        </span>
      </div>

      {event.description && <p className="line-clamp-2 text-sm text-muted">{event.description}</p>}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted">
        {event.location && (
          <>
            <dt className="font-medium text-text">Location</dt>
            <dd>{event.location}</dd>
          </>
        )}
        {event.starts_at && (
          <>
            <dt className="font-medium text-text">Event date</dt>
            <dd>{formatDate(event.starts_at)}</dd>
          </>
        )}
        <dt className="font-medium text-text">Registration opens</dt>
        <dd>{formatDate(event.registration_opens_at)}</dd>
        <dt className="font-medium text-text">Registration closes</dt>
        <dd>{formatDate(event.registration_closes_at)}</dd>
      </dl>

      {event.listingStatus === 'open' && (
        <Button asChild className="mt-auto inline-flex items-center justify-center" size="md">
          <Link to={`/events/${event.slug}/register`}>Register Now</Link>
        </Button>
      )}
    </div>
  )
}

function EventSection({ title, events }: { title: string; events: PublicEventListingItem[] }) {
  if (events.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-text">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}

export function HomePage() {
  const { data: events, isLoading, isError } = usePublicEventListingQuery()

  const openEvents = events?.filter((e) => e.listingStatus === 'open') ?? []
  const upcomingEvents = events?.filter((e) => e.listingStatus === 'upcoming') ?? []
  const pastEvents = events?.filter((e) => e.listingStatus === 'past') ?? []

  return (
    <section className="space-y-10">
      <div className="space-y-2">
        <p className="inline-flex rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary">
          Public Registration
        </p>
        <h1 className="font-heading text-3xl font-bold leading-tight text-text md:text-4xl">
          Events
        </h1>
      </div>

      {isLoading && <p className="text-sm text-muted">Loading events…</p>}

      {isError && (
        <p className="text-sm text-destructive">Unable to load events. Please try again.</p>
      )}

      {!isLoading && !isError && events?.length === 0 && (
        <p className="text-sm text-muted">No open, upcoming, or recent past events at this time.</p>
      )}

      <EventSection events={openEvents} title="Open for Registration" />
      <EventSection events={upcomingEvents} title="Upcoming" />
      <EventSection events={pastEvents} title="Past 3 Months" />
    </section>
  )
}
