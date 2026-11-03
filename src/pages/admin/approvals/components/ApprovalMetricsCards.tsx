import { CheckCircle2, Clock, Inbox, XCircle } from 'lucide-react';

export interface ApprovalMetricsCardsProps {
  metrics: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export function ApprovalMetricsCards({ metrics }: ApprovalMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Pending Card */}
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Pending</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <Clock className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-heading text-2xl font-bold text-text tabular-nums">
            {metrics.pending}
          </div>
          <p className="mt-0.5 text-xs text-muted">Awaiting review</p>
        </div>
      </div>

      {/* Approved Card */}
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Approved
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-heading text-2xl font-bold text-text tabular-nums">
            {metrics.approved}
          </div>
          <p className="mt-0.5 text-xs text-muted">Approved & active</p>
        </div>
      </div>

      {/* Declined Card */}
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Declined
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <XCircle className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-heading text-2xl font-bold text-text tabular-nums">
            {metrics.rejected}
          </div>
          <p className="mt-0.5 text-xs text-muted">Declined requests</p>
        </div>
      </div>

      {/* Total Card */}
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Total Shown
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
            <Inbox className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-heading text-2xl font-bold text-text tabular-nums">
            {metrics.total}
          </div>
          <p className="mt-0.5 text-xs text-muted">Matching current filters</p>
        </div>
      </div>
    </div>
  );
}
