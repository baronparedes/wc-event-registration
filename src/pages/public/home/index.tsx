import { usePublicEventListingQuery } from '../../../hooks/domain/events'
import { EventSection } from './components'

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
