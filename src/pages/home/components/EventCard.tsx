import { Calendar, Clock, Share, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge, Button, MarkdownRenderer } from '@/components/ui';
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
  const countdownPath = toRoute('eventCountdown', { slug: event.slug });
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
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-text flex items-start gap-2 min-w-0">
          <Calendar className="h-5 w-5 shrink-0 text-muted mt-0.5" aria-hidden="true" />
          <span className="break-words">{event.title}</span>
        </h3>
        <div className="shrink-0">
          <Badge
            variant={
              event.listingStatus === 'open'
                ? 'default'
                : event.listingStatus === 'upcoming'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {event.listingStatus === 'open'
              ? 'Open'
              : event.listingStatus === 'upcoming'
                ? 'Upcoming'
                : 'Past'}
          </Badge>
        </div>
      </div>

      {event.description && (
        <MarkdownRenderer
          content={event.description}
          className="text-sm prose-p:text-muted prose-p:leading-relaxed"
        />
      )}

      {event.allow_public_registrations && (
        <div>
          <Badge icon={<Users className="h-3.5 w-3.5" />} variant="outline">
            Open to Guests
          </Badge>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-sm text-muted">
        {event.location && (
          <>
            <dt className="py-0.5 font-semibold text-text">Location</dt>
            <dd className="py-0.5 min-w-0 break-words">{event.location}</dd>
          </>
        )}
        {event.starts_at && (
          <>
            <dt className="py-0.5 font-semibold text-text">Event date</dt>
            <dd className="py-0.5 min-w-0 break-words">{formatDateOnly(event.starts_at)}</dd>
          </>
        )}
        <dt className="py-0.5 font-semibold text-text">Registration opens</dt>
        <dd className="py-0.5 min-w-0 break-words">
          {formatDateOnly(event.registration_opens_at)}
        </dd>
        <dt className="py-0.5 font-semibold text-text">Registration closes</dt>
        <dd className="py-0.5 min-w-0 break-words">
          {formatDateOnly(event.registration_closes_at)}
        </dd>
      </dl>

      {(isOpen || event.listingStatus === 'upcoming') && (
        <div className="mt-auto flex items-center gap-2 pt-1">
          {isOpen ? (
            <Button
              asChild
              className="flex-1 inline-flex min-h-[44px] items-center justify-center font-semibold tracking-wide text-white shadow-xs"
              size="md"
            >
              <Link to={registrationPath}>Register Now</Link>
            </Button>
          ) : (
            <Button
              asChild
              className="flex-1 inline-flex min-h-[44px] items-center justify-center font-semibold tracking-wide shadow-xs"
              size="md"
              variant="primaryOutline"
            >
              <Link
                to={countdownPath}
                aria-label={`View countdown for ${event.title}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Clock className="h-4 w-4 mr-1.5" aria-hidden="true" />
                View Countdown
              </Link>
            </Button>
          )}

          {isOpen && (
            <Button
              asChild
              aria-label={`View countdown for ${event.title}`}
              size="md"
              variant="primaryOutline"
              className="min-h-[44px] min-w-[44px] p-0 flex items-center justify-center shrink-0"
            >
              <Link
                to={countdownPath}
                aria-label={`View countdown for ${event.title}`}
                title="View countdown"
                onClick={(e) => e.stopPropagation()}
              >
                <Clock className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}

          {isOpen && (
            <Button
              aria-label={`Share ${event.title}`}
              onClick={handleShareClick}
              size="md"
              variant="primaryOutline"
              className="min-h-[44px] min-w-[44px] p-0 flex items-center justify-center shrink-0"
            >
              <Share className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
