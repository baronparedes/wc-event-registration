import { CheckCircle2, FileText, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui';
import type { FormStatus } from '@/lib/domain/forms';

const statusConfig: Record<
  FormStatus,
  { label: string; variant: 'success' | 'warning' | 'neutral' | 'danger'; icon: React.ReactNode }
> = {
  draft: {
    label: 'Draft',
    variant: 'neutral',
    icon: <FileText className="h-3 w-3" />,
  },
  published: {
    label: 'Published',
    variant: 'success',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  archived: {
    label: 'Archived',
    variant: 'danger',
    icon: <Trash2 className="h-3 w-3" />,
  },
};

type FormStatusBadgeProps = {
  status: FormStatus;
};

export function FormStatusBadge({ status }: FormStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return (
    <Badge variant={config.variant} icon={config.icon}>
      {config.label}
    </Badge>
  );
}
