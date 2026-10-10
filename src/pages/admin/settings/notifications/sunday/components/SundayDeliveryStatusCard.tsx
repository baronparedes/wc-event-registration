import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Mail,
  Users,
  XCircle,
} from 'lucide-react';

import { Badge, Spinner } from '@/components/ui';
import type { SundayChannelDeliveryStats, SundayDeliveryStatus } from '@/lib/domain/notifications';
import { formatDateOnly, formatDateTime } from '@/lib/infrastructure/dateFormat';

interface SundayDeliveryStatusCardProps {
  alreadySentPush: boolean;
  pushSentAt: string | null;
  pushDelivery?: SundayChannelDeliveryStats | null;
  alreadySentEmail: boolean;
  emailSentAt: string | null;
  emailDelivery?: SundayChannelDeliveryStats | null;
  totalVolunteers: number;
  pushEligibleCount: number;
  emailEligibleCount: number;
  sundayDate?: string;
}

function renderStatusBadge(status?: SundayDeliveryStatus, alreadySent?: boolean) {
  if (status === 'completed') {
    return (
      <Badge variant="default" className="gap-1 text-xs">
        <CheckCircle2 className="h-3 w-3" /> Succeeded
      </Badge>
    );
  }
  if (status === 'partial_failure') {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <AlertTriangle className="h-3 w-3" /> Partial Failure
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <XCircle className="h-3 w-3" /> Failed
      </Badge>
    );
  }
  if (status === 'queued') {
    return (
      <Badge variant="accent" className="gap-1 text-xs">
        <Spinner size="xs" aria-hidden="true" /> In Queue
      </Badge>
    );
  }
  if (alreadySent) {
    return (
      <Badge variant="default" className="gap-1 text-xs">
        <CheckCircle2 className="h-3 w-3" /> Dispatched
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-xs text-muted">
      <Clock className="h-3 w-3" /> Not Sent
    </Badge>
  );
}

function DeliveryBreakdown({ stats }: { stats: SundayChannelDeliveryStats }) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/70 bg-surface-muted/40 p-2 text-center text-xs">
      <div>
        <p className="text-[11px] text-muted">Queued</p>
        <p className="font-semibold text-text">{stats.total_queued}</p>
      </div>
      <div>
        <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Succeeded</p>
        <p className="font-semibold text-emerald-700 dark:text-emerald-300">
          {stats.succeeded_count}
        </p>
      </div>
      <div>
        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">Failed</p>
        <p
          className={`font-semibold ${
            stats.failed_count > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-text'
          }`}
        >
          {stats.failed_count}
        </p>
      </div>
    </div>
  );
}

export function SundayDeliveryStatusCard({
  alreadySentPush,
  pushSentAt,
  pushDelivery,
  alreadySentEmail,
  emailSentAt,
  emailDelivery,
  totalVolunteers,
  pushEligibleCount,
  emailEligibleCount,
  sundayDate,
}: SundayDeliveryStatusCardProps) {
  const isPushSent = alreadySentPush || !!pushDelivery;
  const isEmailSent = alreadySentEmail || !!emailDelivery;
  const isFullySent = isPushSent && isEmailSent;
  const isPartiallySent = (isPushSent || isEmailSent) && !isFullySent;

  const hasAnyFailure =
    pushDelivery?.status === 'partial_failure' ||
    pushDelivery?.status === 'failed' ||
    emailDelivery?.status === 'partial_failure' ||
    emailDelivery?.status === 'failed';

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Push Status */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-text">Push Reminders</span>
          </div>
          {renderStatusBadge(pushDelivery?.status, alreadySentPush)}
        </div>

        <div className="text-xs text-muted">
          {isPushSent ? (
            <p>Sent: {formatDateTime(pushDelivery?.sent_at ?? pushSentAt)}</p>
          ) : (
            <p>Scheduled for automatic Friday 6:00 AM dispatch</p>
          )}
        </div>

        {pushDelivery && <DeliveryBreakdown stats={pushDelivery} />}

        <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
          <span className="text-muted">Reachable Subscribers</span>
          <span className="font-semibold text-text">
            {pushEligibleCount} / {totalVolunteers}
          </span>
        </div>
      </div>

      {/* Email Status */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-text">Email Reminders</span>
          </div>
          {renderStatusBadge(emailDelivery?.status, alreadySentEmail)}
        </div>

        <div className="text-xs text-muted">
          {isEmailSent ? (
            <p>Sent: {formatDateTime(emailDelivery?.sent_at ?? emailSentAt)}</p>
          ) : (
            <p>Scheduled for automatic Friday 6:00 AM dispatch</p>
          )}
        </div>

        {emailDelivery && <DeliveryBreakdown stats={emailDelivery} />}

        <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
          <span className="text-muted">Email Reachable</span>
          <span className="font-semibold text-text">
            {emailEligibleCount} / {totalVolunteers}
          </span>
        </div>
      </div>

      {/* Overall Audience Card */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3 sm:col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-text">Scheduled Audience</span>
          </div>
          {hasAnyFailure ? (
            <Badge variant="destructive" className="text-xs">
              Partial Failure
            </Badge>
          ) : isFullySent ? (
            <Badge variant="default" className="text-xs">
              Complete
            </Badge>
          ) : isPartiallySent ? (
            <Badge variant="accent" className="text-xs">
              Partial
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Pending
            </Badge>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold text-text">{totalVolunteers}</p>
          <p className="text-xs text-muted">
            Total volunteers scheduled on {formatDateOnly(sundayDate || null)}
          </p>
        </div>
        {totalVolunteers === 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-500">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>No commitments configured on {formatDateOnly(sundayDate || null)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
