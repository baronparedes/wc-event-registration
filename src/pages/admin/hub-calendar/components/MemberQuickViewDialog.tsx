import { Mail, Phone, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge, Button, ContactButtons, Dialog } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { getConfidenceTierFromRate } from '@/lib/domain/hub-calendar';
import type { AdminMember, MemberAttendanceStats } from '@/lib/domain/members';

import {
  type ConfidenceThresholds,
  type ConfidenceTier,
  getMemberConfidenceTooltip,
  getStoredConfidenceThresholds,
  isMemberInactiveWithoutAttendance,
} from '../utils';
import { ServiceScheduleAvatar } from './ServiceScheduleAvatar';

export type MemberQuickViewDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  member: AdminMember | null;
  stats?: MemberAttendanceStats;
  isExcused?: boolean;
  thresholds?: ConfidenceThresholds;
};

const TIER_CONFIG: Record<
  ConfidenceTier,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
    cardClass: string;
  }
> = {
  solid: {
    label: 'Solid',
    badgeClass: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30',
    dotClass: 'bg-emerald-500',
    cardClass: 'border-emerald-500/30 bg-emerald-500/5',
  },
  moderate: {
    label: 'Moderate',
    badgeClass: 'bg-amber-500/15 text-amber-800 border-amber-500/30',
    dotClass: 'bg-amber-500',
    cardClass: 'border-amber-500/30 bg-amber-500/5',
  },
  at_risk: {
    label: 'At Risk',
    badgeClass: 'bg-rose-500/15 text-rose-800 border-rose-500/30',
    dotClass: 'bg-rose-500',
    cardClass: 'border-rose-500/30 bg-rose-500/5',
  },
  inactive: {
    label: 'Inactive',
    badgeClass: 'bg-zinc-500/15 text-zinc-800 border-zinc-500/30',
    dotClass: 'bg-zinc-500',
    cardClass: 'border-zinc-500/30 bg-zinc-500/5',
  },
  excused: {
    label: 'Excused',
    badgeClass: 'bg-primary/15 text-primary border-primary/30',
    dotClass: 'bg-primary',
    cardClass: 'border-primary/30 bg-primary/5',
  },
};

export function MemberQuickViewDialog({
  isOpen,
  onClose,
  member,
  stats,
  isExcused = false,
  thresholds,
}: MemberQuickViewDialogProps) {
  const navigate = useNavigate();

  if (!member) return null;

  const effectiveThresholds = thresholds ?? getStoredConfidenceThresholds();
  const isInactive = isMemberInactiveWithoutAttendance(member, stats);
  const avatarTurnupRate = isInactive ? undefined : stats?.turnupRate;

  const confidenceTier: ConfidenceTier = isExcused
    ? 'excused'
    : isInactive
      ? 'inactive'
      : getConfidenceTierFromRate(
          stats !== undefined ? stats.turnupRate : effectiveThresholds.defaultTurnupRate,
          effectiveThresholds,
        );

  const confidenceNote = getMemberConfidenceTooltip(isExcused, stats, effectiveThresholds, member);

  const tierConfig = TIER_CONFIG[confidenceTier];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <Dialog.Header showCloseButton>
        <Dialog.Title>Member Details</Dialog.Title>
      </Dialog.Header>

      <Dialog.Body>
        <div className="flex flex-col items-center text-center mt-4">
          <div className="mb-4">
            <ServiceScheduleAvatar
              size="2xl"
              name={member.full_name}
              avatarObjectKey={member.avatar_object_key}
              excused={isExcused}
              turnupRate={avatarTurnupRate}
              thresholds={effectiveThresholds}
            />
          </div>
          <h3 className="font-heading text-xl font-bold text-text">{member.full_name}</h3>
          <p className="mt-1 text-sm font-medium text-muted">
            {member.member_id} • {member.nickname || 'No nickname'}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {member.role && (
              <Badge variant="secondary" className="px-2.5 py-1">
                <User className="mr-1.5 h-3.5 w-3.5" />
                {member.role}
              </Badge>
            )}
            {member.category && (
              <Badge variant="outline" className="px-2.5 py-1">
                {member.category}
              </Badge>
            )}
          </div>
        </div>

        {/* Confidence Level Callout Card */}
        <div
          data-testid="member-confidence-card"
          className={`mt-5 rounded-xl border p-3.5 text-left transition-colors ${tierConfig.cardClass}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Confidence Level
              </span>
              <Badge
                variant="outline"
                className={`px-2 py-0.5 text-xs font-semibold ${tierConfig.badgeClass}`}
              >
                <span
                  className={`mr-1.5 h-1.5 w-1.5 rounded-full ${tierConfig.dotClass} shrink-0`}
                />
                {tierConfig.label}
              </Badge>
            </div>
            {stats !== undefined && !isExcused && !isInactive ? (
              <span className="text-xs font-bold text-text">
                {Math.round(stats.turnupRate * 100)}% Turnup
              </span>
            ) : !isExcused && !isInactive ? (
              <span className="text-xs font-medium text-muted">
                {Math.round(effectiveThresholds.defaultTurnupRate * 100)}% Turnup (Baseline)
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-text/90 font-medium">{confidenceNote}</p>
        </div>

        <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface-hover/30 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">Email</p>
              <p className="truncate text-sm text-text">
                {member.email ? (
                  <a href={`mailto:${member.email}`} className="hover:underline hover:text-primary">
                    {member.email}
                  </a>
                ) : (
                  <span className="italic text-muted/70">Not provided</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <Phone className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">Phone</p>
                <p className="truncate text-sm text-text">
                  {member.phone ? (
                    <a href={`tel:${member.phone}`} className="hover:underline hover:text-primary">
                      {member.phone}
                    </a>
                  ) : (
                    <span className="italic text-muted/70">Not provided</span>
                  )}
                </p>
              </div>
            </div>
            {member.phone && (
              <div className="shrink-0">
                <ContactButtons phone={member.phone} size="sm" variant="icon" />
              </div>
            )}
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="primaryOutline" onClick={onClose} className="w-full sm:w-auto">
          Close
        </Button>
        <Button
          variant="default"
          onClick={() => {
            onClose();
            navigate(ROUTE_PATHS.adminMemberDetailPattern.replace(':id', member.id));
          }}
          className="w-full sm:w-auto"
        >
          View Full Profile
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
