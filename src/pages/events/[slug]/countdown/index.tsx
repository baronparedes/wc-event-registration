import { useEffect, useState } from 'react';

import DOMPurify from 'dompurify';
import { Calendar, MapPin } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTE_PATHS, toRoute } from '@/config/constants';
import { usePublicEventQuery } from '@/hooks/domain/events';
import { formatDateTime } from '@/lib/infrastructure';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if ('target' in node && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function EventCountdownPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: availability, isLoading, isError } = usePublicEventQuery(slug ?? null);
  const event = availability?.event;

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [isEventStarted, setIsEventStarted] = useState(false);
  const [isPastDate, setIsPastDate] = useState(false);

  useEffect(() => {
    if (!event || !event.starts_at) return;

    const startsAtDate = new Date(event.starts_at);

    const timer = setInterval(() => {
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
        clearInterval(timer);
        setIsPastDate(true);
        navigate(ROUTE_PATHS.home, { replace: true });
        return;
      }

      if (timeDifference <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsEventStarted(true);
        return;
      }

      setTimeLeft({
        days: Math.floor(timeDifference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((timeDifference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((timeDifference / 1000 / 60) % 60),
        seconds: Math.floor((timeDifference / 1000) % 60),
      });
    }, 1000);

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

  if (isError || availability?.status === 'unavailable' || !event) {
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
            <p className="mt-4 text-muted">Head over to the registration page to join us.</p>
            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                onClick={() =>
                  navigate(toRoute('eventPublicRegister', { slug: event.slug }), { replace: true })
                }
              >
                Go to Registration
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-5xl space-y-10 py-8">
        <div className="space-y-6 text-center">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-text sm:text-5xl md:text-7xl">
            {event.title}
          </h1>
          {event.description && (
            <p className="mx-auto max-w-2xl text-balance text-lg text-muted md:text-xl">
              <span
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description) }}
                className="line-clamp-2"
              />
            </p>
          )}
          <div className="mx-auto max-w-md pt-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-2 shadow-xs">
              <Calendar className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <p className="font-medium text-text text-sm sm:text-base">
                {event.starts_at ? formatDateTime(event.starts_at) : 'Date TBA'}
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

        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-semibold uppercase tracking-wider text-muted">Location</h1>
              </div>
            </div>
            <div className="mt-4 border-t border-border/60 pt-3">
              <h2 className="text-text break-words">{event.location || 'Venue to be announced'}</h2>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            size="3xl"
            onClick={() => navigate(toRoute('eventRegister', { slug: event.slug }))}
          >
            Go to Registration Page
          </Button>
        </div>
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
