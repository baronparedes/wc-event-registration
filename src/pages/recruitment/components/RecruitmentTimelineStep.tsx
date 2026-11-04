import type { ReactNode } from 'react';

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
  if (status === 'declined') return 'destructive';
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
  children,
}: RecruitmentTimelineStepProps) {
  return (
    <li className="relative pl-8 pb-7 last:pb-0">
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
          isCurrent ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
        }`}
      >
        {stepNumber}
      </span>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-text">{title}</h3>
          <Badge variant={getBadgeVariant(status)}>{statusLabel ?? STATUS_LABELS[status]}</Badge>
        </div>
        <p className="text-sm text-muted">{description}</p>
        {transaction?.scheduled_at && (
          <p className="text-sm text-text">
            Scheduled: {formatScheduledAt(transaction.scheduled_at)}
          </p>
        )}
        {transaction?.assigned_reviewer_name && (
          <div className="flex items-center gap-2 text-sm text-text">
            <Avatar name={transaction.assigned_reviewer_name} size="sm" />
            <span>{transaction.assigned_reviewer_name}</span>
          </div>
        )}
        {transaction?.applicant_visible_notes && (
          <p className="border-l-2 border-accent pl-3 text-sm text-text">
            {transaction.applicant_visible_notes}
          </p>
        )}
        {children}
      </div>
    </li>
  );
}
