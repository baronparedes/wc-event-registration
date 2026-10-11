import { Clock, Handshake, Percent, UserCheck, Users } from 'lucide-react';

import { ROUTE_PATHS } from '@/config/constants';
import type { DashboardStatsResponse } from '@/hooks/domain/services';

import { type ServiceTimeSlot, TIME_SLOTS } from '../constants';
import { ServiceMetricCard, ServiceSlotCell } from './ServiceMetricCard';

interface ServiceDashboardMetricsProps {
  stats: DashboardStatsResponse;
  dateFilterParams: URLSearchParams;
}

function getTurnupPercentage(present: number, committed: number) {
  if (committed === 0) return 0;
  return Math.round((present / committed) * 100);
}

export function ServiceDashboardMetrics({ stats, dateFilterParams }: ServiceDashboardMetricsProps) {
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

  const getSlot = (ts: ServiceTimeSlot) =>
    stats.time_slots?.[ts] ?? {
      committed: 0,
      present: 0,
      walk_ins: 0,
      late_tardy: 0,
      roles: {},
    };

  const totalCommitted = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).committed, 0);
  const totalPresent = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).present, 0);
  const overallTurnup = getTurnupPercentage(totalPresent, totalCommitted);

  const totalLateTardy = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).late_tardy, 0);
  const totalWalkIns = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).walk_ins, 0);

  return (
    <div className="space-y-6">
      {/* Primary Metric Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Committed */}
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

        {/* Present */}
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

        {/* Turn-up % */}
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
      </div>

      {/* Secondary Exceptions: Late Check-In & Total Walk-Ins */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Late Check-In */}
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

        {/* Total Walk-In */}
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
    </div>
  );
}
