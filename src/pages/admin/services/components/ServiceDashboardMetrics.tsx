import { Clock, Handshake, Percent, UserCheck, UserX, Users } from 'lucide-react';

import { ROUTE_PATHS } from '@/config/constants';
import type { DashboardStatsResponse } from '@/hooks/domain/services';

import { type ServiceTimeSlot, TIME_SLOTS } from '../constants';
import { ServiceMetricCard, ServiceSlotCell } from './ServiceMetricCard';

interface ServiceDashboardMetricsProps {
  stats: DashboardStatsResponse;
  dateFilterParams: URLSearchParams;
  onViewMissed?: (timeSlot?: ServiceTimeSlot | 'All') => void;
}

function getTurnupPercentage(present: number, committed: number) {
  if (committed === 0) return 0;
  return Math.round((present / committed) * 100);
}

export function ServiceDashboardMetrics({
  stats,
  dateFilterParams,
  onViewMissed,
}: ServiceDashboardMetricsProps) {
  const handleDrillDown = (ts: ServiceTimeSlot | null, extraParams?: Record<string, string>) => {
    const params = new URLSearchParams(dateFilterParams);
    if (ts) {
      params.set('time_slot', ts);
    }
    if (extraParams) {
      Object.entries(extraParams).forEach(([key, val]) => params.set(key, val));
    }

    // Open in a new tab
    const url = `${ROUTE_PATHS.adminServiceAttendanceData}?${params.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getSlot = (ts: ServiceTimeSlot) => {
    const raw = stats.time_slots?.[ts];
    return {
      committed: raw?.committed ?? 0,
      present: raw?.present ?? 0,
      walk_ins: raw?.walk_ins ?? 0,
      late_tardy: raw?.late_tardy ?? 0,
      missed: raw?.missed ?? Math.max(0, (raw?.committed ?? 0) - (raw?.present ?? 0)),
      roles: raw?.roles ?? {},
    };
  };

  const totalCommitted = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).committed, 0);
  const totalPresent = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).present, 0);
  const totalMissed = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).missed, 0);
  const overallTurnup = getTurnupPercentage(totalPresent, totalCommitted);

  const totalLateTardy = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).late_tardy, 0);
  const totalWalkIns = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).walk_ins, 0);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
        subtitle="Scheduled turn-up • Click slot to view"
        badgeContent={`${totalPresent} Total`}
        badgeVariant="secondary"
      >
        {TIME_SLOTS.map((ts) => {
          const slot = getSlot(ts);
          const isClickable = slot.present > 0;
          return (
            <ServiceSlotCell
              key={ts}
              timeSlot={ts}
              value={slot.present}
              disabled={!isClickable}
              onClick={() => handleDrillDown(ts)}
              title={`View present attendees for ${ts} (opens in new tab)`}
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

      {/* 4. Missed Commitments (before Late Check-In) */}
      <ServiceMetricCard
        icon={<UserX className="h-5 w-5" />}
        iconClassName="bg-danger/10 text-danger"
        title="Missed Commitments"
        subtitle="Absent volunteers • Click slot to view"
        badgeContent={`${totalMissed} Total`}
        badgeVariant={totalMissed > 0 ? 'destructive' : 'default'}
      >
        {TIME_SLOTS.map((ts) => {
          const slot = getSlot(ts);
          const isClickable = slot.missed > 0;
          return (
            <ServiceSlotCell
              key={ts}
              timeSlot={ts}
              value={slot.missed}
              disabled={!isClickable}
              onClick={() => onViewMissed?.(ts)}
              title={`View missed volunteers for ${ts}`}
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
        subtitle="Override check-ins • Click slot to view"
        badgeContent={`${totalLateTardy} Total`}
        badgeVariant="accent"
      >
        {TIME_SLOTS.map((ts) => {
          const count = getSlot(ts).late_tardy;
          const isClickable = count > 0;
          return (
            <ServiceSlotCell
              key={ts}
              timeSlot={ts}
              value={count}
              disabled={!isClickable}
              onClick={() => handleDrillDown(ts, { is_late_tardy: 'true' })}
              title={`View late/tardy attendees for ${ts} (opens in new tab)`}
            />
          );
        })}
      </ServiceMetricCard>

      {/* 6. Total Walk-In */}
      <ServiceMetricCard
        icon={<Users className="h-5 w-5" />}
        iconClassName="bg-secondary/15 text-secondary"
        title="Total Walk-In"
        subtitle="Uncommitted attendees • Click slot to view"
        badgeContent={`${totalWalkIns} Total`}
        badgeVariant="secondary"
      >
        {TIME_SLOTS.map((ts) => {
          const count = getSlot(ts).walk_ins;
          const isClickable = count > 0;
          return (
            <ServiceSlotCell
              key={ts}
              timeSlot={ts}
              value={count}
              disabled={!isClickable}
              onClick={() => handleDrillDown(ts, { is_walk_in: 'true' })}
              title={`View walk-in attendees for ${ts} (opens in new tab)`}
            />
          );
        })}
      </ServiceMetricCard>
    </div>
  );
}
