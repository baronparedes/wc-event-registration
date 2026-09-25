import { LifecycleStatusBadge } from '@/components/ui';
import type { EventStatus } from '@/lib/domain/events';

export type EventStatusBadgeProps = {
  status: EventStatus;
  className?: string;
};

export function EventStatusBadge({ status, className }: EventStatusBadgeProps) {
  return <LifecycleStatusBadge status={status} className={className} />;
}
