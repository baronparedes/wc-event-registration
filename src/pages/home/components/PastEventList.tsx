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
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-text">Past Events (Last 3 Months)</h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {events.map((event) => {
          return (
            <li
              key={event.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-2 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <p className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 shrink-0 text-muted mt-0.5" aria-hidden="true" />
                  {event.title}
                </p>
                {event.starts_at && (
                  <span className="text-xs text-muted">{formatDateOnly(event.starts_at)}</span>
                )}
              </div>
              {event.location && (
                <Badge
                  icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
                  variant="neutral"
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
