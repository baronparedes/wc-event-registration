import { Clock, Handshake, Percent, Pointer, UserCheck, Users } from 'lucide-react';

import { Badge } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import type { DashboardStatsResponse } from '@/hooks/domain/services';

import { type ServiceTimeSlot, TIME_SLOTS } from '../constants';

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
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Handshake className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-heading font-semibold text-text">Committed</h3>
                <p className="truncate text-xs text-muted">Expected volunteers</p>
              </div>
            </div>
            <Badge variant="default" className="shrink-0">
              {totalCommitted} Total
            </Badge>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((ts) => (
              <div
                key={ts}
                className="flex h-28 flex-col items-center justify-between rounded-xl border border-border/50 bg-background p-2.5 text-center"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-medium text-muted">{ts}</span>
                </div>
                <span className="font-heading text-2xl font-bold text-text">
                  {getSlot(ts).committed}
                </span>
                <div className="flex h-5 w-full items-center justify-center">
                  <span className="text-[10px] text-muted">—</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Present */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-heading font-semibold text-text">Present</h3>
                <p className="truncate text-xs text-muted">
                  Scheduled turn-up • Click slot to view
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {totalPresent} Total
            </Badge>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((ts) => {
              const slot = getSlot(ts);
              const isClickable = slot.present > 0;
              return (
                <button
                  key={ts}
                  type="button"
                  onClick={() => handleDrillDown(ts)}
                  disabled={!isClickable}
                  className={`group relative flex h-28 flex-col items-center justify-between rounded-xl border p-2.5 text-center transition-all ${
                    isClickable
                      ? 'cursor-pointer border-border/60 bg-background hover:border-primary/50 hover:bg-primary/5 hover:shadow-xs'
                      : 'cursor-default border-border/40 bg-background/50 opacity-40'
                  }`}
                  title={
                    isClickable ? `View present attendees for ${ts} (opens in new tab)` : undefined
                  }
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-medium text-muted">{ts}</span>
                    {isClickable && (
                      <Pointer className="h-3.5 w-3.5 text-muted/50 transition-transform group-hover:scale-110 group-hover:text-primary" />
                    )}
                  </div>
                  <span className="font-heading text-2xl font-bold text-text transition-colors group-hover:text-primary">
                    {slot.present}
                  </span>
                  <div className="flex h-5 w-full items-center justify-center">
                    {slot.walk_ins > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                        +{slot.walk_ins} walk-in
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted">—</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Turn-up % */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-text">
                <Percent className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-heading font-semibold text-text">Turn-Up Rate</h3>
                <p className="truncate text-xs text-muted">Attended vs Committed</p>
              </div>
            </div>
            <Badge variant={overallTurnup < 50 ? 'destructive' : 'default'} className="shrink-0">
              {overallTurnup}% Avg
            </Badge>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((ts) => {
              const slot = getSlot(ts);
              const perc = getTurnupPercentage(slot.present, slot.committed);
              const isLow = perc < 50;
              return (
                <div
                  key={ts}
                  className={`flex h-28 flex-col items-center justify-between rounded-xl border p-2.5 text-center transition-colors ${
                    isLow ? 'border-danger/30 bg-danger/5' : 'border-border/50 bg-background'
                  }`}
                >
                  <span className="text-xs font-medium text-muted">{ts}</span>
                  <span
                    className={`font-heading text-2xl font-bold ${
                      isLow ? 'text-danger' : 'text-primary'
                    }`}
                  >
                    {perc}%
                  </span>
                  <div className="flex h-5 w-full items-center justify-center">
                    <span className="text-[10px] font-medium text-muted">
                      {slot.present}/{slot.committed}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Secondary Exceptions: Late/Tardy & Total Walk-Ins */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Late Check-In */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-text">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-heading font-semibold text-text">Late Check-In</h3>
                <p className="truncate text-xs text-muted">
                  Override check-ins • Click slot to view
                </p>
              </div>
            </div>
            <Badge variant="accent" className="shrink-0">
              {totalLateTardy} Total
            </Badge>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((ts) => {
              const count = getSlot(ts).late_tardy;
              const isClickable = count > 0;
              return (
                <button
                  key={ts}
                  type="button"
                  onClick={() => handleDrillDown(ts, { is_late_tardy: 'true' })}
                  disabled={!isClickable}
                  className={`group relative flex h-28 flex-col items-center justify-between rounded-xl border p-2.5 text-center transition-all ${
                    isClickable
                      ? 'cursor-pointer border-border/60 bg-background hover:border-primary/50 hover:bg-primary/5 hover:shadow-xs'
                      : 'cursor-default border-border/40 bg-background/50 opacity-40'
                  }`}
                  title={
                    isClickable
                      ? `View late/tardy attendees for ${ts} (opens in new tab)`
                      : undefined
                  }
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-medium text-muted">{ts}</span>
                    {isClickable && (
                      <Pointer className="h-3.5 w-3.5 text-muted/50 transition-transform group-hover:scale-110 group-hover:text-primary" />
                    )}
                  </div>
                  <span className="font-heading text-2xl font-bold text-text transition-colors group-hover:text-primary">
                    {count}
                  </span>
                  <div className="flex h-5 w-full items-center justify-center">
                    <span className="text-[10px] text-muted">—</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Total Walk-In */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-heading font-semibold text-text">Total Walk-In</h3>
                <p className="truncate text-xs text-muted">
                  Uncommitted attendees • Click slot to view
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {totalWalkIns} Total
            </Badge>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((ts) => {
              const count = getSlot(ts).walk_ins;
              const isClickable = count > 0;
              return (
                <button
                  key={ts}
                  type="button"
                  onClick={() => handleDrillDown(ts, { is_walk_in: 'true' })}
                  disabled={!isClickable}
                  className={`group relative flex h-28 flex-col items-center justify-between rounded-xl border p-2.5 text-center transition-all ${
                    isClickable
                      ? 'cursor-pointer border-border/60 bg-background hover:border-primary/50 hover:bg-primary/5 hover:shadow-xs'
                      : 'cursor-default border-border/40 bg-background/50 opacity-40'
                  }`}
                  title={
                    isClickable ? `View walk-in attendees for ${ts} (opens in new tab)` : undefined
                  }
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-medium text-muted">{ts}</span>
                    {isClickable && (
                      <Pointer className="h-3.5 w-3.5 text-muted/50 transition-transform group-hover:scale-110 group-hover:text-primary" />
                    )}
                  </div>
                  <span className="font-heading text-2xl font-bold text-text transition-colors group-hover:text-primary">
                    {count}
                  </span>
                  <div className="flex h-5 w-full items-center justify-center">
                    <span className="text-[10px] text-muted">—</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
