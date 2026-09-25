import { LifecycleStatusBadge } from '@/components/ui';
import type { FormStatus } from '@/lib/domain/forms';

export type FormStatusBadgeProps = {
  status: FormStatus;
  className?: string;
};

export function FormStatusBadge({ status, className }: FormStatusBadgeProps) {
  return <LifecycleStatusBadge status={status} className={className} />;
}
