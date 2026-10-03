import { AlertCircle, Bell, CheckCircle2, Clock, Mail, Users } from 'lucide-react';

import { Badge } from '@/components/ui';
import { formatDateTime } from '@/lib/infrastructure/dateFormat';

interface SundayDeliveryStatusCardProps {
  alreadySentPush: boolean;
  pushSentAt: string | null;
  alreadySentEmail: boolean;
  emailSentAt: string | null;
  totalVolunteers: number;
  pushEligibleCount: number;
  emailEligibleCount: number;
}

export function SundayDeliveryStatusCard({
  alreadySentPush,
  pushSentAt,
  alreadySentEmail,
  emailSentAt,
  totalVolunteers,
  pushEligibleCount,
  emailEligibleCount,
}: SundayDeliveryStatusCardProps) {
  const isFullySent = alreadySentPush && alreadySentEmail;
  const isPartiallySent = (alreadySentPush || alreadySentEmail) && !isFullySent;

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
          {alreadySentPush ? (
            <Badge variant="default" className="gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" /> Dispatched
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs text-muted">
              <Clock className="h-3 w-3" /> Not Sent
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted">
          {alreadySentPush ? (
            <p>Sent: {formatDateTime(pushSentAt)}</p>
          ) : (
            <p>Scheduled for automatic Friday 6:00 AM dispatch</p>
          )}
        </div>
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
          {alreadySentEmail ? (
            <Badge variant="default" className="gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" /> Dispatched
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs text-muted">
              <Clock className="h-3 w-3" /> Not Sent
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted">
          {alreadySentEmail ? (
            <p>Sent: {formatDateTime(emailSentAt)}</p>
          ) : (
            <p>Scheduled for automatic Friday 6:00 AM dispatch</p>
          )}
        </div>
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
          {isFullySent ? (
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
          <p className="text-xs text-muted">Total volunteers scheduled for this Sunday</p>
        </div>
        {totalVolunteers === 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-500">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>No commitments configured for this Sunday</span>
          </div>
        )}
      </div>
    </div>
  );
}
