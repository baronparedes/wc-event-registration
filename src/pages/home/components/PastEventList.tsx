import { Link } from 'react-router-dom';

import { toRoute } from '@/config/constants';
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
          const registrationPath = toRoute('eventRegister', { slug: event.slug });

          return (
            <li
              key={event.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-2 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <Link
                  to={registrationPath}
                  className="font-medium text-text hover:underline focus:outline-none focus-visible:underline"
                >
                  {event.title}
                </Link>
                {event.starts_at && (
                  <span className="text-xs text-muted">{formatDateOnly(event.starts_at)}</span>
                )}
              </div>
              {event.location && (
                <span className="text-sm text-muted sm:text-right">{event.location}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
