import { AlertCircle, Bell, Loader2, Mail, Users } from 'lucide-react';

import { Badge } from '@/components/ui';
import { useBroadcastAudienceStatsQuery } from '@/hooks/domain/notifications';
import type { BroadcastChannel } from '@/lib/domain/notifications';

interface BroadcastAudienceStatsCardProps {
  channels: BroadcastChannel[];
  targetType: 'all' | 'role' | 'user' | 'event';
  targetRoles?: string[];
  targetUserId?: string;
  targetEventId?: string;
}

export function BroadcastAudienceStatsCard({
  channels,
  targetType,
  targetRoles,
  targetUserId,
  targetEventId,
}: BroadcastAudienceStatsCardProps) {
  const isEnabled =
    targetType === 'all' ||
    (targetType === 'role' && !!targetRoles && targetRoles.length > 0) ||
    (targetType === 'user' && !!targetUserId) ||
    (targetType === 'event' && !!targetEventId);

  const {
    data: stats,
    isLoading,
    isError,
  } = useBroadcastAudienceStatsQuery({
    targetType,
    targetRoles,
    targetUserId,
    targetEventId,
    enabled: isEnabled,
  });

  if (!isEnabled) {
    return null;
  }

  const isPush = channels.includes('push');
  const isEmail = channels.includes('email');

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
          <Users className="h-4 w-4 text-primary" />
          <span>Audience Delivery Analysis</span>
        </div>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Validating recipients...</span>
          </div>
        )}
      </div>

      {isError ? (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-500/10 p-2.5 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to evaluate recipient audience reach.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Total Attendees / Matches */}
          <div className="rounded-lg border border-border/80 bg-background p-3">
            <p className="text-[11px] font-medium text-muted">
              {targetType === 'event' ? 'Total Event Attendees' : 'Total Matched Users'}
            </p>
            <p className="text-xl font-bold text-text mt-0.5">{stats?.total_recipients ?? 0}</p>
            {targetType === 'event' && stats && (
              <div className="flex items-center gap-1 text-[11px] text-muted mt-1">
                <span>{stats.registered_members_count} members</span>
                <span>•</span>
                <span>{stats.public_registrants_count} guests</span>
              </div>
            )}
          </div>

          {/* Email Channel Reach */}
          <div
            className={`rounded-lg border p-3 transition-opacity ${
              isEmail
                ? 'border-border/80 bg-background'
                : 'border-border/40 bg-background/50 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span>Email Reach</span>
              </div>
              {isEmail && (
                <Badge variant="primaryOutline" className="text-[10px] px-1.5 py-0">
                  Active
                </Badge>
              )}
            </div>
            <p className="text-xl font-bold text-text mt-0.5">
              {stats?.email_recipients_count ?? 0}
            </p>
            <p className="text-[11px] text-muted mt-1">
              {stats?.total_recipients && stats.email_recipients_count < stats.total_recipients ? (
                <span className="text-amber-500">
                  {stats.total_recipients - stats.email_recipients_count} missing email
                </span>
              ) : (
                <span>100% email coverage</span>
              )}
            </p>
          </div>

          {/* Push Channel Reach */}
          <div
            className={`rounded-lg border p-3 transition-opacity ${
              isPush
                ? 'border-border/80 bg-background'
                : 'border-border/40 bg-background/50 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <Bell className="h-3.5 w-3.5 text-primary" />
                <span>Push Reach</span>
              </div>
              {isPush && (
                <Badge variant="primaryOutline" className="text-[10px] px-1.5 py-0">
                  Active
                </Badge>
              )}
            </div>
            <p className="text-xl font-bold text-text mt-0.5">
              {stats?.push_recipients_count ?? 0}
            </p>
            <p className="text-[11px] text-muted mt-1">
              <span>With active browser subscription</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
