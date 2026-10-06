import { Calendar, MapPin } from 'lucide-react';

import { Badge } from '@/components/ui';
import type { PublicEventListingItem } from '@/lib/domain/events';
import { formatDateOnly } from '@/lib/infrastructure';

type PastEventListProps = {
  events: PublicEventListingItem[];
};

export function PastEventList({ events }: PastEventListProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="font-heading text-base font-semibold text-text">
        Past Events (Last 3 Months)
      </h2>
      <ul className="divide-y divide-border/60 rounded-xl border border-border bg-surface shadow-xs overflow-hidden">
        {events.map((event) => {
          return (
            <li
              key={event.id}
              className="flex flex-col gap-1.5 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 hover:bg-background/60 transition-colors"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 sm:flex-nowrap sm:gap-2.5">
                <Calendar className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="truncate text-sm font-medium text-text">{event.title}</span>
                {event.starts_at && (
                  <>
                    <span className="hidden text-xs text-muted sm:inline" aria-hidden="true">
                      •
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {formatDateOnly(event.starts_at)}
                    </span>
                  </>
                )}
              </div>
              {event.location && (
                <Badge
                  icon={<MapPin className={`h-3 w-3`} aria-hidden="true" />}
                  className="self-start px-2 py-0.5 text-xs text-muted sm:self-auto"
                >
                  {event.location}
                </Badge>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
