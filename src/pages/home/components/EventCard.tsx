import { useId, useState } from 'react';

import { Calendar, ChevronDown, Clock, MapPin, Share, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge, Button, MarkdownRenderer } from '@/components/ui';
import { toRoute } from '@/config/constants';
import { getEventCoverPublicUrl } from '@/lib/domain/events';
import type { PublicEventListingItem } from '@/lib/domain/events';
import { formatDateOnly, formatTimeOnly } from '@/lib/infrastructure';

type EventCardProps = {
  event: PublicEventListingItem;
};

function getEventDateBadge(isoDate: string | null) {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;

  const labels = new Map(
    new Intl.DateTimeFormat('en', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Manila',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const calendarParts = new Map(
    new Intl.DateTimeFormat('en', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Manila',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

  return {
    isoDate,
    labels,
    calendarDay: Date.UTC(
      Number(calendarParts.get('year')),
      Number(calendarParts.get('month')) - 1,
      Number(calendarParts.get('day')),
    ),
  };
}

/**
 * Displays a single event card with title, status, description, and key dates.
 * Used in event listing pages to show available and past events.
 */
export function EventCard({ event }: EventCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();
  const navigate = useNavigate();
  const registrationPath = toRoute('eventRegister', { slug: event.slug });
  const countdownPath = toRoute('eventCountdown', { slug: event.slug });
  const shareUrl = new URL(registrationPath, window.location.origin).toString();
  const isOpen = event.listingStatus === 'open';
  const customCoverUrl = getEventCoverPublicUrl(event.cover_image_key);
  const startDateBadge = getEventDateBadge(event.starts_at);
  const endDateBadge = getEventDateBadge(event.ends_at);
  const showEndTime = Boolean(
    startDateBadge &&
    endDateBadge &&
    startDateBadge.calendarDay === endDateBadge.calendarDay &&
    new Date(endDateBadge.isoDate).getTime() > new Date(startDateBadge.isoDate).getTime() &&
    formatTimeOnly(startDateBadge.isoDate) !== formatTimeOnly(endDateBadge.isoDate),
  );
  const showEndDate =
    startDateBadge &&
    endDateBadge &&
    endDateBadge.calendarDay - startDateBadge.calendarDay >= 2 * 24 * 60 * 60 * 1000;
  const dateBadges = startDateBadge
    ? [startDateBadge, ...(showEndDate && endDateBadge ? [endDateBadge] : [])]
    : [];

  const handleCardClick = () => {
    if (!isOpen) {
      return;
    }

    navigate(registrationPath);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen || e.target !== e.currentTarget) {
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
      className={`group relative isolate flex self-start flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary [container-type:inline-size] ${isOpen ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={isOpen ? 'link' : undefined}
      tabIndex={isOpen ? 0 : undefined}
    >
      {customCoverUrl && !detailsOpen && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
          <img
            src={customCoverUrl}
            alt=""
            className="h-full w-full object-cover object-center scale-105 opacity-80"
          />
          {/* Opaque on the left for title readability, with a frosted barrier on the right protecting badges */}
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/90 via-40% to-surface/50 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/60 to-transparent sm:hidden" />
        </div>
      )}

      <div className="relative isolate z-10 flex flex-col gap-4 p-5 sm:min-h-[340px]">
        {!customCoverUrl && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -bottom-6 -z-10 text-primary opacity-[0.04] dark:opacity-[0.06] select-none"
          >
            <Calendar className="h-44 w-44 stroke-[0.75] -rotate-12 transform" />
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          {dateBadges.length > 0 ? (
            <div className="flex min-w-0 items-start gap-1 sm:gap-2">
              {dateBadges.map((dateBadge, index) => (
                <time
                  key={dateBadge.isoDate}
                  dateTime={dateBadge.isoDate}
                  aria-label={`${index === 0 ? 'Starts' : 'Ends'} ${formatDateOnly(dateBadge.isoDate)}, ${formatTimeOnly(dateBadge.isoDate)}${showEndTime ? ` to ${formatTimeOnly(event.ends_at)}` : ''}`}
                  className={`flex shrink-0 flex-col overflow-hidden rounded-md text-center border border-border/80 shadow-xs backdrop-blur-md ${dateBadges.length === 1 ? 'w-[148px] sm:w-[168px]' : 'w-[72px] sm:w-20'}`}
                >
                  {showEndDate && (
                    <span className="py-0.5 text-[9px] leading-tight text-muted">
                      {index === 0 ? 'From' : 'To'}
                    </span>
                  )}
                  <span className="bg-white px-2 py-1.5 text-xs font-semibold text-text">
                    {dateBadge.labels.get('weekday')}
                  </span>
                  <span className="bg-primary px-2 py-2 text-white">
                    <span className="block font-heading text-2xl font-bold leading-none">
                      {dateBadge.labels.get('day')}
                    </span>
                    <span className="mt-1 block text-xs">
                      {dateBadge.labels.get('month')} {dateBadge.labels.get('year')}
                    </span>
                  </span>
                  <span className="bg-gray-100 px-1 py-1.5 text-[10px] font-semibold text-gray-600 sm:text-xs">
                    {formatTimeOnly(dateBadge.isoDate)}
                    {showEndTime && ` to ${formatTimeOnly(event.ends_at)}`}
                  </span>
                </time>
              ))}
            </div>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 flex-col items-end gap-2 [@container(min-width:340px)]:flex-row [@container(min-width:340px)]:items-center">
            <Badge
              className="border-border/80 bg-surface/90 shadow-xs backdrop-blur-md"
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
            <button
              type="button"
              aria-label={`${detailsOpen ? 'Hide' : 'Show'} details for ${event.title}`}
              aria-expanded={detailsOpen}
              aria-controls={detailsId}
              title={detailsOpen ? 'Hide details' : 'Show details'}
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                setDetailsOpen(!detailsOpen);
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-surface/90 text-text shadow-xs backdrop-blur-md transition-colors hover:bg-primary/10 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 transition-transform duration-200 ${detailsOpen ? 'rotate-180' : 'rotate-0'}`}
              />
            </button>
          </div>
        </div>
        <div className="mt-auto space-y-4">
          <div
            className={
              customCoverUrl && !detailsOpen
                ? 'space-y-2 rounded-xl border border-border bg-white p-3.5 shadow-sm'
                : 'space-y-2'
            }
          >
            {event.location && (
              <Badge
                icon={<MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />}
                variant="outline"
                className="max-w-full !whitespace-normal border-border bg-surface text-sm !font-semibold shadow-xs"
              >
                <span className="min-w-0 break-words">{event.location}</span>
              </Badge>
            )}
            <h3 className="break-words font-heading text-xl font-bold leading-tight text-text [overflow-wrap:anywhere]">
              {event.title}
            </h3>
          </div>
          {event.allow_public_registrations && (
            <Badge
              icon={<Users className="h-3.5 w-3.5" />}
              variant="outline"
              className="border-border/80 bg-surface/90 shadow-xs backdrop-blur-md"
            >
              Open to Guests
            </Badge>
          )}
          {(isOpen || event.listingStatus === 'upcoming') && (
            <div className="flex items-center gap-2">
              {isOpen ? (
                <Button
                  asChild
                  className="flex-1 inline-flex min-h-[44px] items-center justify-center font-semibold shadow-xs"
                  size="md"
                >
                  <Link to={registrationPath}>Register Now</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  className="flex-1 inline-flex min-h-[44px] items-center justify-center font-semibold shadow-xs"
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
                  title="Share event"
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
      </div>
      <div
        id={detailsId}
        hidden={!detailsOpen}
        className="relative z-10 space-y-4 border-t border-border p-5 cursor-default"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        {customCoverUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-background shadow-xs">
            <img src={customCoverUrl} alt={event.title} className="h-full w-full object-cover" />
          </div>
        )}
        {event.description && (
          <MarkdownRenderer
            content={event.description}
            className="text-sm prose-p:text-muted prose-p:leading-relaxed"
          />
        )}
        <dl className="divide-y divide-border border-t border-border text-sm">
          {event.starts_at && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
              <dt className="text-xs text-muted">Event date</dt>
              <dd className="min-w-0 break-words text-right font-medium text-text">
                {formatDateOnly(event.starts_at)}
              </dd>
            </div>
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
            <dt className="text-xs text-muted">Registration opens</dt>
            <dd className="min-w-0 break-words text-right font-medium text-text">
              {formatDateOnly(event.registration_opens_at)}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
            <dt className="text-xs text-muted">Registration closes</dt>
            <dd className="min-w-0 break-words text-right font-medium text-text">
              {formatDateOnly(event.registration_closes_at)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
