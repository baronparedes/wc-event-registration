import type { PublicEventListingItem } from '@/lib/domain/events'
import { EventCard } from './EventCard'

type EventSectionProps = {
  title: string
  events: PublicEventListingItem[]
}

/**
 * Renders a titled section containing a grid of EventCards.
 * Hides the section if no events are provided.
 */
export function EventSection({ title, events }: EventSectionProps) {
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
