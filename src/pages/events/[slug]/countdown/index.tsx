import { useEffect, useState } from 'react';

import { Calendar, Home, MapPin, Share2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge, Button, EmptyState, MarkdownRenderer, Skeleton } from '@/components/ui';
import { ROUTE_PATHS, toRoute } from '@/config/constants';
import { usePublicEventQuery } from '@/hooks/domain/events';
import { getEventCoverPublicUrl } from '@/lib/domain/events';
import { formatDateTime } from '@/lib/infrastructure';

import { AddToCalendarDropdown, ShareCountdownDialog } from './components';
import { formatEventSchedule, generateQrCodeDataUrl } from './utils';

export function EventCountdownPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: availability, isLoading, isError } = usePublicEventQuery(slug ?? null);
  const event = availability?.event;
  const isRegistrationOpen = availability?.status === 'available';
  const coverUrl = getEventCoverPublicUrl(event?.cover_image_key);

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [isEventStarted, setIsEventStarted] = useState(false);
  const [isPastDate, setIsPastDate] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const eventSlug = event?.slug;
  useEffect(() => {
    if (!eventSlug) return;
    const registrationUrl = `${window.location.origin}${toRoute('eventRegister', { slug: eventSlug })}`;
    let isMounted = true;
    generateQrCodeDataUrl(registrationUrl)
      .then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      })
      .catch((err) => console.error('Failed to generate QR code data URL:', err));
    return () => {
      isMounted = false;
    };
  }, [eventSlug]);

  useEffect(() => {
    if (!event || !event.starts_at) return;

    const startsAtDate = new Date(event.starts_at);

    const updateTimer = () => {
      const now = new Date();
      const timeDifference = startsAtDate.getTime() - now.getTime();

      // Check if the current date is strictly after the event's start date
      // (Ignoring time, just based on calendar day)
      const isSameDay =
        now.getFullYear() === startsAtDate.getFullYear() &&
        now.getMonth() === startsAtDate.getMonth() &&
        now.getDate() === startsAtDate.getDate();

      const isAfterStartDay = now.getTime() > startsAtDate.getTime() && !isSameDay;

      if (isAfterStartDay) {
        setIsPastDate(true);
        navigate(ROUTE_PATHS.home, { replace: true });
        return false;
      }

      if (timeDifference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsEventStarted(true);
        return false;
      }

      setTimeLeft({
        days: Math.floor(timeDifference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((timeDifference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((timeDifference / 1000 / 60) % 60),
        seconds: Math.floor((timeDifference / 1000) % 60),
      });

      return true;
    };

    const shouldContinue = updateTimer();
    if (!shouldContinue) return;

    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [event, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-4xl space-y-8 rounded-3xl bg-surface p-8 shadow-sm">
          <Skeleton className="mx-auto h-12 w-3/4 rounded-xl" />
          <Skeleton className="mx-auto h-6 w-1/2 rounded-xl" />
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !event || availability?.reason === 'not_found_or_unpublished') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <EmptyState
          icon="event"
          title="Event Unavailable"
          description="The event you're looking for doesn't exist or is not published yet."
          action={
            <Button onClick={() => navigate(ROUTE_PATHS.home)} variant="primaryOutline">
              Back to Home
            </Button>
          }
        />
      </div>
    );
  }

  // Fallback rendering in case redirect hasn't completed
  if (isPastDate) {
    return null;
  }

  if (isEventStarted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-4xl text-center">
          <div className="mb-6 space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-text sm:text-5xl md:text-6xl">
              {event.title}
            </h1>
            <p className="text-lg font-medium text-muted">
              {event.starts_at && formatDateTime(event.starts_at)}
            </p>
          </div>
          <div className="my-12 rounded-3xl border border-primary/20 bg-primary/5 p-12">
            <h2 className="text-3xl font-bold text-primary">The Event has Started</h2>
            <p className="mt-4 text-muted">
              {isRegistrationOpen
                ? 'Head over to the registration page to join us.'
                : 'Registration for this event is closed.'}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                variant={isRegistrationOpen ? 'primaryOutline' : 'default'}
                className="w-full sm:w-auto"
                onClick={() => navigate(ROUTE_PATHS.home)}
              >
                <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                Go Home
              </Button>
              {isRegistrationOpen && (
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    navigate(toRoute('eventPublicRegister', { slug: event.slug }), {
                      replace: true,
                    })
                  }
                >
                  Go to Registration
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-5xl space-y-10 py-8">
        {coverUrl && (
          <div className="relative mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-surface shadow-md">
            <img src={coverUrl} alt={event.title} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="space-y-6 text-center">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-text sm:text-5xl md:text-7xl">
            {event.title}
          </h1>
          {event.description && (
            <div className="mx-auto max-w-2xl">
              <MarkdownRenderer content={event.description} />
            </div>
          )}
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 pt-2">
            <div className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-slate-100/90 px-5 py-3 shadow-2xs">
              <Calendar className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
              <p className="font-bold text-text text-base sm:text-lg">
                {formatEventSchedule(event.starts_at, event.ends_at)}
              </p>
            </div>
            <div className="inline-flex max-w-full items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-slate-100/90 px-5 py-3 shadow-2xs">
              <MapPin className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
              <p className="min-w-0 break-words font-bold text-text text-base sm:text-lg">
                {event.location || 'Venue to be announced'}
              </p>
            </div>
          </div>
        </div>

        {/* Countdown Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          <CountdownCard label="Days" value={timeLeft.days} />
          <CountdownCard label="Hours" value={timeLeft.hours} />
          <CountdownCard label="Minutes" value={timeLeft.minutes} />
          <CountdownCard label="Seconds" value={timeLeft.seconds} />
        </div>

        {qrCodeDataUrl && (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
              <img
                src={qrCodeDataUrl}
                alt="Scan QR code to register for the event"
                className="h-48 w-48 object-contain sm:h-56 sm:w-56"
              />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider text-muted">
              Scan to Register
            </span>
          </div>
        )}

        {!isRegistrationOpen && (
          <div className="flex justify-center">
            <Badge
              variant="accent"
              className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
            >
              {availability?.reason === 'not_open_yet'
                ? 'Registration Not Open'
                : 'Registration Closed'}
            </Badge>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
          <Button
            size="3xl"
            variant={isRegistrationOpen ? 'primaryOutline' : 'default'}
            className="w-full sm:w-auto"
            onClick={() => navigate(ROUTE_PATHS.home)}
          >
            <Home className="h-5 w-5 mr-2" aria-hidden="true" />
            Go Home
          </Button>
          <AddToCalendarDropdown event={event} className="w-full sm:w-auto" />
          <Button
            size="3xl"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setIsShareOpen(true)}
          >
            <Share2 className="h-5 w-5 mr-2" aria-hidden="true" />
            Share
          </Button>
          {isRegistrationOpen && (
            <Button
              size="3xl"
              className="w-full sm:w-auto"
              onClick={() => navigate(toRoute('eventRegister', { slug: event.slug }))}
            >
              Go to Registration Page
            </Button>
          )}
        </div>

        <ShareCountdownDialog
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          event={event}
          coverUrl={coverUrl}
          timeLeft={timeLeft}
        />
      </div>
    </div>
  );
}

function CountdownCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-2 rounded-3xl border border-border bg-surface px-4 py-8 shadow-xs sm:px-6 sm:py-10">
      <span className="text-5xl font-black tabular-nums tracking-tighter text-primary sm:text-7xl md:text-8xl">
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-xs font-bold uppercase tracking-widest text-muted sm:text-sm">
        {label}
      </span>
    </div>
  );
}
