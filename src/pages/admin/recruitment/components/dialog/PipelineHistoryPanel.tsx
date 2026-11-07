import { useState } from 'react';

import { Calendar, CheckCircle2, Filter, History, User } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type {
  RecruitmentApplication,
  RecruitmentPipelineTransaction,
} from '@/lib/domain/recruitment';
import { RECRUITMENT_STEPS } from '@/lib/domain/recruitment/constants';
import { formatDateTime } from '@/lib/infrastructure';

export interface PipelineHistoryPanelProps {
  application: RecruitmentApplication;
  transactions: RecruitmentPipelineTransaction[];
}

export function PipelineHistoryPanel({ transactions }: PipelineHistoryPanelProps) {
  const [selectedStepFilter, setSelectedStepFilter] = useState<number | 'all'>('all');

  const filteredTransactions = transactions.filter((tx) =>
    selectedStepFilter === 'all' ? true : tx.step_number === selectedStepFilter,
  );

  const formatActivityTitle = (tx: RecruitmentPipelineTransaction) => {
    const stepDef = RECRUITMENT_STEPS.find((s) => s.stepNumber === tx.step_number);
    const stepLabel = stepDef
      ? `Step ${tx.step_number}: ${stepDef.shortLabel}`
      : `Step ${tx.step_number}`;

    switch (tx.transaction_type) {
      case 'completed':
        return `${stepLabel} — Completed`;
      case 'scheduled':
        return `${stepLabel} — Session Scheduled`;
      case 'rescheduled':
        return `${stepLabel} — Session Rescheduled`;
      case 'repeated_step':
        return `${stepLabel} — Repeat Attempt Scheduled`;
      case 'returned_to_observation':
        return 'Returned to Observation (Step 4)';
      case 'returned_to_interview':
        return 'Returned to Interview (Step 2)';
      case 'archived':
        return `${stepLabel} — Applicant Archived`;
      case 'restored':
        return `${stepLabel} — Applicant Restored to Active`;
      case 'declined':
        return `${stepLabel} — Application Declined`;
      default:
        return `${stepLabel} Activity`;
    }
  };

  const getStatusBadgeVariant = (tx: RecruitmentPipelineTransaction) => {
    switch (tx.status) {
      case 'completed':
        return 'default';
      case 'scheduled':
      case 'in_progress':
        return 'accent';
      case 'declined':
      case 'archived':
        return 'destructive';
      case 'on_hold':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Step Filters */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary shrink-0" />
            <div>
              <h3 className="font-heading text-base font-bold text-text">
                Pipeline Transaction History
              </h3>
              <p className="text-xs text-muted">
                Complete audit trail of all sessions, step transitions, evaluations, and notes.
              </p>
            </div>
          </div>
          <Badge variant="outline">
            {transactions.length} Total {transactions.length === 1 ? 'Record' : 'Records'}
          </Badge>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-semibold text-muted flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3" />
            Filter:
          </span>
          <Button
            type="button"
            size="sm"
            variant={selectedStepFilter === 'all' ? 'default' : 'outline'}
            className="h-7 text-xs px-2.5 py-0"
            onClick={() => setSelectedStepFilter('all')}
          >
            All Steps ({transactions.length})
          </Button>
          {RECRUITMENT_STEPS.map((s) => {
            const count = transactions.filter((tx) => tx.step_number === s.stepNumber).length;
            if (count === 0) return null;
            return (
              <Button
                key={s.stepNumber}
                type="button"
                size="sm"
                variant={selectedStepFilter === s.stepNumber ? 'default' : 'outline'}
                className="h-7 text-xs px-2.5 py-0"
                onClick={() => setSelectedStepFilter(s.stepNumber)}
              >
                Step {s.stepNumber} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
          <p className="text-sm font-medium text-muted">
            No transaction records found for the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...filteredTransactions].reverse().map((tx) => (
            <div
              key={tx.id}
              className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-2.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/70 pb-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-bold text-text">
                      {formatActivityTitle(tx)}
                    </span>
                    {tx.attempt_number > 1 && (
                      <Badge variant="outline" className="text-[11px] py-0 px-2">
                        Attempt #{tx.attempt_number}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted">{formatDateTime(tx.created_at)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(tx)} className="capitalize">
                    {tx.status}
                  </Badge>
                </div>
              </div>

              {/* Transaction Metadata Details */}
              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                {tx.scheduled_at && (
                  <div className="flex items-center gap-1.5 text-muted">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Session Scheduled:{' '}
                      <strong className="text-text">{formatDateTime(tx.scheduled_at)}</strong>
                    </span>
                  </div>
                )}
                {tx.completed_at && (
                  <div className="flex items-center gap-1.5 text-muted">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Completed On:{' '}
                      <strong className="text-text">{formatDateTime(tx.completed_at)}</strong>
                    </span>
                  </div>
                )}
                {tx.assigned_reviewer_name && (
                  <div className="flex items-center gap-1.5 text-muted">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Reviewer / Coach:{' '}
                      <strong className="text-text">{tx.assigned_reviewer_name}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {tx.notes && (
                <div className="rounded-lg border border-border bg-background p-3 text-xs space-y-1">
                  <span className="font-semibold text-text">Reviewer Notes:</span>
                  <p className="text-muted whitespace-pre-wrap">{tx.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
