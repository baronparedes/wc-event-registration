import { Skeleton } from '@/components/ui/Skeleton'
import { usePublicEventListingQuery } from '@/hooks/domain/events'
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

      {isLoading ? (
        <div className="space-y-6" aria-hidden="true">
          <div className="space-y-3">
            <Skeleton className="h-5 w-44" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`events-skeleton-${index}`}
                  className="space-y-3 rounded-xl border border-border bg-surface p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <div className="space-y-2 pt-1">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                  <Skeleton className="mt-2 h-9 w-36" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

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
