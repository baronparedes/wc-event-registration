import { useMemo } from 'react';

import { format, isValid, parseISO } from 'date-fns';
import {
  Briefcase,
  CalendarDays,
  Clock,
  Handshake,
  Percent,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';

import { Badge, BrandAvatar } from '@/components/ui';
import { LEGAL_CONFIG } from '@/config/constants';
import type { DashboardStatsResponse } from '@/hooks/domain/services';
import { type ServiceTimeSlot, TIME_SLOTS } from '@/pages/admin/services/constants';

import { ServiceMetricCard, ServiceSlotCell } from '../ServiceMetricCard';
import { getTurnupPercentage } from './utils';

export type ServiceDashboardShareCardProps = {
  stats: DashboardStatsResponse;
  filterMode: 'sunday' | 'month' | 'annual';
  selectedSunday: string;
  selectedYear: number;
  selectedMonth: number;
};

export function ServiceDashboardShareCard({
  stats,
  filterMode,
  selectedSunday,
  selectedYear,
  selectedMonth,
}: ServiceDashboardShareCardProps) {
  const getSlot = (ts: ServiceTimeSlot) => {
    const raw = stats.time_slots?.[ts];
    return {
      committed: raw?.committed ?? 0,
      present: raw?.present ?? 0,
      walk_ins: raw?.walk_ins ?? 0,
      late_tardy: raw?.late_tardy ?? 0,
      missed: raw?.missed ?? Math.max(0, (raw?.committed ?? 0) - (raw?.present ?? 0)),
      roles: raw?.roles ?? {},
      committed_roles: raw?.committed_roles ?? {},
    };
  };

  const totalCommitted = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).committed, 0);
  const totalPresent = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).present, 0);
  const totalMissed = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).missed, 0);
  const overallTurnup = getTurnupPercentage(totalPresent, totalCommitted);
  const totalLateTardy = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).late_tardy, 0);
  const totalWalkIns = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).walk_ins, 0);

  const roles = useMemo(() => {
    const set = new Set([...(stats.roles ?? []), ...(stats.committed_roles ?? [])]);
    return Array.from(set).sort();
  }, [stats.roles, stats.committed_roles]);

  const displayDate = () => {
    try {
      if (filterMode === 'sunday') {
        if (!selectedSunday) return 'Sunday Service';
        const parsed = parseISO(selectedSunday);
        return isValid(parsed) ? format(parsed, 'MMMM d, yyyy') : selectedSunday;
      }
      if (filterMode === 'month') {
        if (!selectedYear || !selectedMonth) return 'Monthly Summary';
        const d = new Date(selectedYear, selectedMonth - 1, 1);
        return isValid(d) ? format(d, 'MMMM yyyy') : `Month ${selectedMonth}, ${selectedYear}`;
      }
      return selectedYear ? `Year ${selectedYear}` : 'Annual Summary';
    } catch {
      return 'Services Dashboard';
    }
  };

  return (
    <div
      style={{ width: '960px', minWidth: '960px', maxWidth: '960px' }}
      className="relative flex flex-col w-[960px] min-w-[960px] max-w-[960px] shrink-0 box-border rounded-2xl border border-border bg-surface font-sans text-text shadow-sm overflow-hidden"
    >
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-8 py-6">
        <div className="flex items-center gap-4">
          <BrandAvatar size="md" alt={LEGAL_CONFIG.appName} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">Services Dashboard</h1>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span>{displayDate()}</span>
            </div>
          </div>
        </div>

        <div>
          <Badge
            variant={overallTurnup < 50 ? 'destructive' : 'default'}
            className="text-sm px-3 py-1 font-bold"
          >
            {overallTurnup}% Overall Turn-Up
          </Badge>
        </div>
      </div>

      {/* Primary 6 Metrics Grid */}
      <div className="grid grid-cols-3 gap-4 p-8 pb-6">
        {/* 1. Committed */}
        <ServiceMetricCard
          icon={<Handshake className="h-5 w-5" />}
          iconClassName="bg-primary/10 text-primary"
          title="Committed"
          subtitle="Expected volunteers"
          badgeContent={`${totalCommitted} Total`}
          badgeVariant="default"
        >
          {TIME_SLOTS.map((ts) => (
            <ServiceSlotCell key={ts} timeSlot={ts} value={getSlot(ts).committed} />
          ))}
        </ServiceMetricCard>

        {/* 2. Present */}
        <ServiceMetricCard
          icon={<UserCheck className="h-5 w-5" />}
          iconClassName="bg-secondary/15 text-secondary"
          title="Present"
          subtitle="Scheduled turn-up"
          badgeContent={`${totalPresent} Total`}
          badgeVariant="secondary"
        >
          {TIME_SLOTS.map((ts) => {
            const slot = getSlot(ts);
            return (
              <ServiceSlotCell
                key={ts}
                timeSlot={ts}
                value={slot.present}
                sublabel={
                  slot.walk_ins > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                      +{slot.walk_ins} walk-in
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
            );
          })}
        </ServiceMetricCard>

        {/* 3. Turn-up % */}
        <ServiceMetricCard
          icon={<Percent className="h-5 w-5" />}
          iconClassName="bg-accent/20 text-text"
          title="Turn-Up Rate"
          subtitle="Attended vs Committed"
          badgeContent={`${overallTurnup}% Avg`}
          badgeVariant={overallTurnup < 50 ? 'destructive' : 'default'}
        >
          {TIME_SLOTS.map((ts) => {
            const slot = getSlot(ts);
            const perc = getTurnupPercentage(slot.present, slot.committed);
            const isLow = perc < 50;
            return (
              <ServiceSlotCell
                key={ts}
                timeSlot={ts}
                value={`${perc}%`}
                isLowRate={isLow}
                valueClassName={isLow ? 'text-danger' : 'text-primary'}
                sublabel={
                  <span className="text-[10px] font-medium text-muted">
                    {slot.present}/{slot.committed}
                  </span>
                }
              />
            );
          })}
        </ServiceMetricCard>

        {/* 4. Missed Commitments */}
        <ServiceMetricCard
          icon={<UserX className="h-5 w-5" />}
          iconClassName="bg-danger/10 text-danger"
          title="Missed Commitments"
          subtitle="Absent volunteers"
          badgeContent={`${totalMissed} Total`}
          badgeVariant={totalMissed > 0 ? 'destructive' : 'default'}
        >
          {TIME_SLOTS.map((ts) => {
            const slot = getSlot(ts);
            return (
              <ServiceSlotCell
                key={ts}
                timeSlot={ts}
                value={slot.missed}
                valueClassName={slot.missed > 0 ? 'text-danger' : undefined}
              />
            );
          })}
        </ServiceMetricCard>

        {/* 5. Late Check-In */}
        <ServiceMetricCard
          icon={<Clock className="h-5 w-5" />}
          iconClassName="bg-accent/20 text-text"
          title="Late Check-In"
          subtitle="Override check-ins"
          badgeContent={`${totalLateTardy} Total`}
          badgeVariant="accent"
        >
          {TIME_SLOTS.map((ts) => (
            <ServiceSlotCell key={ts} timeSlot={ts} value={getSlot(ts).late_tardy} />
          ))}
        </ServiceMetricCard>

        {/* 6. Total Walk-In */}
        <ServiceMetricCard
          icon={<Users className="h-5 w-5" />}
          iconClassName="bg-secondary/15 text-secondary"
          title="Total Walk-In"
          subtitle="Uncommitted attendees"
          badgeContent={`${totalWalkIns} Total`}
          badgeVariant="secondary"
        >
          {TIME_SLOTS.map((ts) => (
            <ServiceSlotCell key={ts} timeSlot={ts} value={getSlot(ts).walk_ins} />
          ))}
        </ServiceMetricCard>
      </div>

      {/* Attendance & Commitment by Role */}
      <div className="px-8 pb-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border bg-surface-hover/30 px-5 py-3">
            <h2 className="font-heading text-sm font-semibold text-text">
              Attendance & Commitment by Role
            </h2>
            <p className="text-xs text-muted">
              Attended / Committed volunteer counts per role across service time slots
            </p>
          </div>

          <div className="p-4">
            {roles.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted">
                No volunteer roles recorded for this period.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {roles.map((role) => {
                  const attendedTotal = TIME_SLOTS.reduce(
                    (sum, ts) => sum + (getSlot(ts).roles?.[role] || 0),
                    0,
                  );
                  const committedTotal = TIME_SLOTS.reduce(
                    (sum, ts) => sum + (getSlot(ts).committed_roles?.[role] || 0),
                    0,
                  );
                  return (
                    <div
                      key={role}
                      className="flex flex-col justify-between rounded-xl border border-border bg-background p-3.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Briefcase className="h-3 w-3" />
                          </div>
                          <h4
                            className="truncate font-heading text-xs font-semibold text-text"
                            title={role}
                          >
                            {role}
                          </h4>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {attendedTotal} / {committedTotal}
                        </Badge>
                      </div>

                      <div className="mt-2.5 grid grid-cols-3 divide-x divide-border/60 rounded-lg border border-border/60 bg-surface py-1">
                        {TIME_SLOTS.map((ts) => {
                          const attended = getSlot(ts).roles?.[role] || 0;
                          const committed = getSlot(ts).committed_roles?.[role] || 0;
                          return (
                            <div key={ts} className="flex flex-col items-center px-1 text-center">
                              <span className="text-[9px] font-medium text-muted">{ts}</span>
                              <div className="mt-0.5 flex items-baseline gap-0.5">
                                <span className="font-heading text-sm font-bold text-text">
                                  {attended}
                                </span>
                                <span className="text-[10px] text-muted/50">/</span>
                                <span className="font-heading text-[10px] font-semibold text-muted">
                                  {committed}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-surface-hover/20 px-8 py-3.5 text-center text-xs text-muted">
        Generated from {LEGAL_CONFIG.organizationName} on {format(new Date(), 'MMM d, yyyy')}
      </div>
    </div>
  );
}
