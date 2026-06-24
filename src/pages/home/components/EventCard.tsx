import { Link } from 'react-router-dom'
import type { PublicEventListingItem } from '@/lib/domain/events'
import { Button } from '@/components/ui/Button'
import { formatDateOnly } from '@/lib/infrastructure'

type EventCardProps = {
  event: PublicEventListingItem
}

/**
 * Displays a single event card with title, status, description, and key dates.
 * Used in event listing pages to show available and past events.
 */
export function EventCard({ event }: EventCardProps) {
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
            <dd>{formatDateOnly(event.starts_at)}</dd>
          </>
        )}
        <dt className="font-medium text-text">Registration opens</dt>
        <dd>{formatDateOnly(event.registration_opens_at)}</dd>
        <dt className="font-medium text-text">Registration closes</dt>
        <dd>{formatDateOnly(event.registration_closes_at)}</dd>
      </dl>

      {event.listingStatus === 'open' && (
        <Button asChild className="mt-auto inline-flex items-center justify-center" size="md">
          <Link to={`/events/${event.slug}/register`}>Register Now</Link>
        </Button>
      )}
    </div>
  )
}
