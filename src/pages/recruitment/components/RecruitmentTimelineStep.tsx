import type { ReactNode } from 'react';

import { Calendar, Check } from 'lucide-react';

import { Avatar, Badge } from '@/components/ui';
import type {
  ApplicantRecruitmentTimelineItem,
  RecruitmentStageStatus,
} from '@/lib/domain/recruitment';

type TimelineStatus = RecruitmentStageStatus | 'locked';

type RecruitmentTimelineStepProps = {
  stepNumber: number;
  title: string;
  description: string;
  status: TimelineStatus;
  statusLabel?: string;
  transaction?: ApplicantRecruitmentTimelineItem;
  isCurrent: boolean;
  isLast?: boolean;
  isPathActive?: boolean;
  children?: ReactNode;
};

const STATUS_LABELS: Record<TimelineStatus, string> = {
  locked: 'Upcoming',
  pending: 'Pending',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
  on_hold: 'On Hold',
  archived: 'Archived',
  declined: 'Declined',
};

function getBadgeVariant(status: TimelineStatus) {
  if (status === 'completed') return 'default';
  if (status === 'skipped') return 'secondary';
  if (status === 'declined' || status === 'archived') return 'destructive';
  if (status === 'scheduled') return 'accent';
  return 'outline';
}

function formatScheduledAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function RecruitmentTimelineStep({
  stepNumber,
  title,
  description,
  status,
  statusLabel,
  transaction,
  isCurrent,
  isLast = false,
  isPathActive = false,
  children,
}: RecruitmentTimelineStepProps) {
  const isCompleted = status === 'completed';
  const isSkipped = status === 'skipped';

  let nodeAriaLabel = `Step ${stepNumber}`;
  if (isCompleted) {
    nodeAriaLabel = `Step ${stepNumber} completed`;
  } else if (isCurrent) {
    nodeAriaLabel = `Step ${stepNumber} in progress`;
  }

  let nodeClassName = 'border border-border bg-surface text-muted';
  if (isCompleted) {
    nodeClassName = 'bg-primary text-white shadow-xs';
  } else if (isCurrent) {
    nodeClassName =
      'border-2 border-primary bg-surface font-bold text-primary shadow-xs ring-4 ring-primary/20';
  } else if (isSkipped) {
    nodeClassName = 'border border-border bg-background text-muted';
  }

  return (
    <li className="relative flex gap-4">
      {/* Node column & connecting vertical line */}
      <div className="flex flex-col items-center">
        <div
          aria-label={nodeAriaLabel}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all ${nodeClassName}`}
        >
          {isCompleted ? (
            <Check aria-hidden="true" className="h-4 w-4 stroke-[2.5]" />
          ) : (
            <span>{stepNumber}</span>
          )}
        </div>
        {!isLast && (
          <div
            aria-hidden="true"
            className={`my-1.5 w-0.5 flex-1 transition-colors ${
              isPathActive ? 'bg-primary' : 'bg-border'
            }`}
          />
        )}
      </div>

      {/* Step content */}
      <div className={`min-w-0 flex-1 space-y-2 pt-1 ${isLast ? 'pb-1' : 'pb-8'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`text-base font-semibold ${isCurrent ? 'text-primary' : 'text-text'}`}>
            {title}
          </h3>
          <Badge variant={getBadgeVariant(status)}>{statusLabel ?? STATUS_LABELS[status]}</Badge>
        </div>
        <p className="text-sm text-muted">{description}</p>
        {(transaction?.scheduled_at || transaction?.assigned_reviewer_name) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">
            {transaction.scheduled_at && (
              <div className="flex items-center gap-1.5 text-text">
                <Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
                <span>Scheduled: {formatScheduledAt(transaction.scheduled_at)}</span>
              </div>
            )}
            {transaction.assigned_reviewer_name && (
              <div className="flex items-center gap-2 text-text">
                <Avatar name={transaction.assigned_reviewer_name} size="xs" />
                <span className="font-medium text-text">{transaction.assigned_reviewer_name}</span>
              </div>
            )}
          </div>
        )}
        {children}
      </div>
    </li>
  );
}
