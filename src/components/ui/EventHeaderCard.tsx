import DOMPurify from 'dompurify';
import { Users } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { CollapsibleSectionCard } from '@/components/ui/CollapsibleSectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import type { EventAvailability } from '@/lib/domain/events';
import { formatDateTime } from '@/lib/infrastructure';

type EventHeaderCardProps = {
  slug?: string;
  isLoading: boolean;
  isError: boolean;
  availability?: EventAvailability;
  isGateReady: boolean;
  eventWindowText: { opens: string; closes: string } | null;
  defaultExpanded?: boolean;
};

export function EventHeaderCard(props: EventHeaderCardProps) {
  const { slug, isLoading, isError, availability, isGateReady, eventWindowText, defaultExpanded } =
    props;

  const event =
    availability?.status === 'available' ||
    (availability?.status === 'unavailable' && availability.reason !== 'not_found_or_unpublished')
      ? (availability as Extract<EventAvailability, { event: unknown }>).event
      : null;

  const title = event?.title ?? 'Register for This Event';
  const statusBadgeVariant =
    availability?.status === 'available'
      ? 'open'
      : availability?.status === 'unavailable' && availability.reason === 'not_open_yet'
        ? 'upcoming'
        : 'closed';
  const statusBadgeLabel =
    availability?.status === 'available'
      ? 'Open'
      : availability?.status === 'unavailable' && availability.reason === 'not_open_yet'
        ? 'Opens Soon'
        : 'Closed';

  return (
    <CollapsibleSectionCard
      defaultExpanded={defaultExpanded}
      collapseLabel="Collapse event registration info"
      expandLabel="Expand event registration info"
      title={title}
      subtitle={
        event ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusBadgeVariant}>{statusBadgeLabel}</Badge>
            {event.allow_public_registrations && (
              <Badge icon={<Users className="h-3.5 w-3.5" />} variant="guest">
                Open to Guests
              </Badge>
            )}
            {availability?.status === 'available' && (
              <span className="text-xs font-medium text-muted">
                Registered: <span className="text-text">{availability.registration_count}</span>
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Event Registration
          </span>
        )
      }
      wrapperClassName="rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      {isLoading && (
        <div className="mt-4 space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <div className="mt-3 grid gap-2 rounded-lg border border-border bg-background/70 p-3 sm:grid-cols-2">
            <Skeleton className="h-4 w-3/4 sm:col-span-2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      )}

      {event?.description && (
        <div
          className="
              mt-3 text-sm text-muted leading-relaxed
              [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-text [&_h1]:mb-3
              [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-text [&_h2]:mb-2
              [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-text [&_h3]:mb-2
              [&_p]:mb-3
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
              [&_a]:text-primary [&_a]:underline
              [&_table]:w-full [&_table]:border-collapse [&_table]:mt-2 [&_table]:mb-3
              [&_th]:border [&_th]:border-border [&_th]:bg-accent/20 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-text
              [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-text
              [&_tr:nth-child(even)]:bg-background/40
              [&_tr:hover]:bg-accent/10
            "
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description) }}
        />
      )}

      {event && (
        <div className="mt-4 grid gap-2 rounded-lg border border-border bg-background/70 p-3 text-sm text-muted sm:grid-cols-2">
          {event.location && (
            <p className="sm:col-span-2">
              Location: <span className="font-medium text-text">{event.location}</span>
            </p>
          )}
          <p>
            Starts: <span className="font-medium text-text">{formatDateTime(event.starts_at)}</span>
          </p>
          <p>
            Ends: <span className="font-medium text-text">{formatDateTime(event.ends_at)}</span>
          </p>
        </div>
      )}

      {slug && !event && (
        <p className="mt-2 text-sm text-muted">
          Event code: <span className="font-mono text-text">{slug}</span>
        </p>
      )}

      {isGateReady && eventWindowText && (
        <div className="mt-4 grid gap-2 rounded-lg border border-border bg-background/70 p-3 text-sm text-muted sm:grid-cols-2">
          <p>
            Registration opens:{' '}
            <span className="font-medium text-text">{eventWindowText.opens}</span>
          </p>
          <p>
            Registration closes:{' '}
            <span className="font-medium text-text">{eventWindowText.closes}</span>
          </p>
        </div>
      )}

      {isError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          This event is unavailable right now.
        </p>
      )}

      {availability?.status === 'unavailable' &&
        availability.reason === 'not_found_or_unpublished' && (
          <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            This event is unavailable right now.
          </p>
        )}

      {availability?.status === 'unavailable' && availability.reason === 'not_open_yet' && (
        <p className="mt-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-text">
          Registration opens soon.
        </p>
      )}

      {availability?.status === 'unavailable' && availability.reason === 'registration_closed' && (
        <p className="mt-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-text">
          Registration has already closed.
        </p>
      )}
    </CollapsibleSectionCard>
  );
}
