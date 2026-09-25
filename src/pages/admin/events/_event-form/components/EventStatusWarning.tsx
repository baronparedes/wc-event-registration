import { AlertBanner } from '@/components/ui';

type EventStatusWarningProps = {
  status: 'draft' | 'published' | 'archived';
};

/**
 * Warning banner displayed when editing published or archived events.
 * Published: warns about visibility to registrants
 * Archived: informs that event is immutable
 */
export function EventStatusWarning({ status }: EventStatusWarningProps) {
  if (status === 'draft') return null;

  if (status === 'archived') {
    return (
      <AlertBanner
        variant="warning"
        description="This event is archived and cannot be edited. Publish it again to make changes."
      />
    );
  }

  if (status === 'published') {
    return (
      <AlertBanner
        variant="info"
        description="This event is published. Changes will be visible to registrants."
      />
    );
  }

  return null;
}
