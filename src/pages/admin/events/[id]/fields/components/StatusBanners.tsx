import { AlertBanner } from '@/components/ui';
import type { EventStatus } from '@/lib/domain/events';

type StatusBannersProps = {
  eventStatus: EventStatus;
};

/** Display published or archived status warnings. */
export function StatusBanners({ eventStatus }: StatusBannersProps) {
  if (eventStatus === 'published') {
    return (
      <div className="mx-6 mt-4">
        <AlertBanner
          variant="info"
          title="Published event"
          description="You can edit labels, placeholder/help text, and option capacity. To change field types, options, or other validation rules, archive this event and create a new one."
        />
      </div>
    );
  }

  if (eventStatus === 'archived') {
    return (
      <div className="mx-6 mt-4">
        <AlertBanner
          variant="warning"
          title="Archived event"
          description="Field edits are disabled on archived events."
        />
      </div>
    );
  }

  return null;
}
