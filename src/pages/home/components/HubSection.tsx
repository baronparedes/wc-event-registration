import type { PublicEventListingItem } from '@/lib/domain/events';
import type { AdminForm } from '@/lib/domain/forms';

import { EventCard } from './EventCard';
import { FormCard } from './FormCard';

export type HubItem = ({ type: 'event' } & PublicEventListingItem) | ({ type: 'form' } & AdminForm);

type HubSectionProps = {
  title: string;
  items: HubItem[];
};

/**
 * Renders a titled section containing a grid of Mixed cards (Events or Forms).
 * Hides the section if no items are provided.
 */
export function HubSection({ title, items }: HubSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-text">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          if (item.type === 'event') {
            return <EventCard key={`event-${item.id}`} event={item} />;
          }
          if (item.type === 'form') {
            return <FormCard key={`form-${item.id}`} form={item} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}
