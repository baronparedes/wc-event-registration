import type { EventStatus } from '@/lib/admin/types'

const statusConfig: Record<EventStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-surface text-muted border border-border',
  },
  published: {
    label: 'Published',
    className: 'bg-green-100 text-green-700 border border-green-200',
  },
  archived: {
    label: 'Archived',
    className: 'bg-red-50 text-red-600 border border-red-200',
  },
}

type EventStatusBadgeProps = {
  status: EventStatus
}

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.draft
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
