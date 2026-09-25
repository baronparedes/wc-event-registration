import { Users } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { CollapsibleSectionCard } from '@/components/ui/CollapsibleSectionCard';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
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

  const event = availability?.event;

  const title = event?.title ?? 'Register for This Event';
  const statusBadgeVariant =
    availability?.status === 'available'
      ? 'default'
      : availability?.status === 'unavailable' && availability.reason === 'not_open_yet'
        ? 'secondary'
        : 'outline';
  const statusBadgeLabel =
    availability?.status === 'available'
      ? 'Open'
      : availability?.status === 'unavailable' && availability.reason === 'not_open_yet'
        ? 'Opens Soon'
        : 'Closed';
  const titleContent = event ? (
    <div className="flex min-w-0 flex-col items-stretch gap-2 pr-10 sm:flex-row sm:items-center sm:justify-between">
      <span className="min-w-0 truncate">{title}</span>
      <div className="flex min-w-0 max-w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
        {availability?.status === 'available' && (
          <span className="max-w-full break-words text-right text-xs font-medium text-muted">
            Registered: <span className="text-text">{availability.registration_count}</span>
          </span>
        )}
        {event.allow_public_registrations && (
          <Badge icon={<Users className="h-3.5 w-3.5" />} variant="outline">
            Open to Guests
          </Badge>
        )}
        <Badge variant={statusBadgeVariant}>{statusBadgeLabel}</Badge>
      </div>
    </div>
  ) : (
    title
  );

  return (
    <CollapsibleSectionCard
      defaultExpanded={defaultExpanded}
      collapseLabel="Collapse event registration info"
      expandLabel="Expand event registration info"
      title={titleContent}
      subtitle={
        !event && (
          <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Event Registration
          </span>
        )
      }
      wrapperClassName="rounded-2xl border border-border bg-surface p-3 shadow-sm"
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
        <div className="mt-3">
          <MarkdownRenderer content={event.description} />
        </div>
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
