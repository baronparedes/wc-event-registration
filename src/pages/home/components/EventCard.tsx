import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge, Button } from '@/components/ui';
import { toEventRegistration } from '@/config/constants';
import type { PublicEventListingItem } from '@/lib/domain/events';
import { formatDateOnly } from '@/lib/infrastructure';

type EventCardProps = {
  event: PublicEventListingItem;
};

/**
 * Displays a single event card with title, status, description, and key dates.
 * Used in event listing pages to show available and past events.
 */
export function EventCard({ event }: EventCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-text">{event.title}</h3>
        <Badge
          variant={
            event.listingStatus === 'open'
              ? 'open'
              : event.listingStatus === 'upcoming'
                ? 'upcoming'
                : 'closed'
          }
        >
          {event.listingStatus === 'open'
            ? 'Open'
            : event.listingStatus === 'upcoming'
              ? 'Upcoming'
              : 'Past'}
        </Badge>
      </div>

      {event.description && <p className="line-clamp-2 text-sm text-muted">{event.description}</p>}

      {event.allow_public_registrations && (
        <div>
          <Badge icon={<Users className="h-3.5 w-3.5" />} variant="guest">
            Open to Guests
          </Badge>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted">
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
          <Link to={toEventRegistration(event.slug)}>Register Now</Link>
        </Button>
      )}
    </div>
  );
}
