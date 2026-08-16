import { Share, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge, Button } from '@/components/ui';
import { toRoute } from '@/config/constants';
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
  const navigate = useNavigate();
  const registrationPath = toRoute('eventRegister', { slug: event.slug });
  const shareUrl = new URL(registrationPath, window.location.origin).toString();
  const isOpen = event.listingStatus === 'open';

  const handleCardClick = () => {
    if (!isOpen) {
      return;
    }

    navigate(registrationPath);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) {
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(registrationPath);
    }
  };

  const handleShareClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const canUseNativeShare =
      typeof navigator.share === 'function' &&
      (!navigator.canShare || navigator.canShare({ url: shareUrl }));

    if (canUseNativeShare) {
      try {
        await navigator.share({
          title: event.title,
          url: shareUrl,
        });
        return;
      } catch (error) {
        // Ignore user-cancelled native share and avoid showing fallback errors.
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Event link copied to clipboard.');
    } catch {
      toast.error('Failed to share event link.');
    }
  };

  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] ${isOpen ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={isOpen ? 'link' : undefined}
      tabIndex={isOpen ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-text">{event.title}</h3>
        <div className="flex items-start gap-2">
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
          {isOpen && (
            <div>
              <Button
                aria-label={`Share ${event.title}`}
                onClick={handleShareClick}
                size="sm"
                variant="primaryOutline"
              >
                <Share className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
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

      {isOpen && (
        <Button asChild className="mt-auto inline-flex items-center justify-center" size="md">
          <Link to={registrationPath}>Register Now</Link>
        </Button>
      )}
    </div>
  );
}
