import type { EventStatus } from '@/lib/domain/events'
import { Badge } from '@/components/ui'
import { CheckCircle2, Trash2, FileText } from 'lucide-react'

const statusConfig: Record<
  EventStatus,
  { label: string; variant: 'open' | 'upcoming' | 'closed' | 'error'; icon: React.ReactNode }
> = {
  draft: {
    label: 'Draft',
    variant: 'closed',
    icon: <FileText className="h-3 w-3" />,
  },
  published: {
    label: 'Published',
    variant: 'open',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  archived: {
    label: 'Archived',
    variant: 'error',
    icon: <Trash2 className="h-3 w-3" />,
  },
}

type EventStatusBadgeProps = {
  status: EventStatus
}

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.draft
  return (
    <Badge variant={config.variant} icon={config.icon}>
      {config.label}
    </Badge>
  )
}
