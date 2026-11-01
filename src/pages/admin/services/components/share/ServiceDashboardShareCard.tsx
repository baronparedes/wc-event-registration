import { format, parseISO } from 'date-fns';
import { CalendarDays, Clock, Handshake, Percent, UserCheck, UserX, Users } from 'lucide-react';

import { AiBrandIcon } from '@/components/ui';
import type { DashboardStatsResponse } from '@/hooks/domain/services';
import { type ServiceTimeSlot, TIME_SLOTS } from '@/pages/admin/services/constants';

type ServiceDashboardShareCardProps = {
  stats: DashboardStatsResponse;
  filterMode: 'sunday' | 'month' | 'annual';
  selectedSunday: string;
  selectedYear: number;
  selectedMonth: number;
};

function getTurnupPercentage(present: number, committed: number) {
  if (committed === 0) return 0;
  return Math.round((present / committed) * 100);
}

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
    };
  };

  const totalCommitted = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).committed, 0);
  const totalPresent = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).present, 0);
  const totalMissed = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).missed, 0);
  const overallTurnup = getTurnupPercentage(totalPresent, totalCommitted);
  const totalLateTardy = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).late_tardy, 0);
  const totalWalkIns = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).walk_ins, 0);

  const displayDate = () => {
    if (filterMode === 'sunday') {
      return format(parseISO(selectedSunday), 'MMMM d, yyyy');
    }
    if (filterMode === 'month') {
      return format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy');
    }
    return `Year ${selectedYear}`;
  };

  return (
    <div className="relative flex flex-col w-[800px] overflow-hidden bg-background font-sans text-text shadow-2xl">
      {/* Background decoration */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-secondary/5 blur-3xl" />

      {/* Header section */}
      <div className="relative z-10 flex items-center justify-between border-b border-border/50 bg-surface/50 px-8 py-6 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-border/50">
            <AiBrandIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">Service Dashboard</h1>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span>{displayDate()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-5 p-8">
        {/* Metric Cards */}
        <MetricCard
          title="Turn-Up Rate"
          value={`${overallTurnup}%`}
          icon={<Percent className="h-6 w-6 text-accent" />}
          iconBg="bg-accent/20"
        />
        <MetricCard
          title="Present Volunteers"
          value={totalPresent}
          icon={<UserCheck className="h-6 w-6 text-secondary" />}
          iconBg="bg-secondary/20"
        />
        <MetricCard
          title="Expected Volunteers"
          value={totalCommitted}
          icon={<Handshake className="h-6 w-6 text-primary" />}
          iconBg="bg-primary/20"
        />
        <MetricCard
          title="Missed Commitments"
          value={totalMissed}
          icon={<UserX className="h-6 w-6 text-danger" />}
          iconBg="bg-danger/20"
        />
        <MetricCard
          title="Late Check-In"
          value={totalLateTardy}
          icon={<Clock className="h-6 w-6 text-accent" />}
          iconBg="bg-accent/20"
        />
        <MetricCard
          title="Walk-In Attendees"
          value={totalWalkIns}
          icon={<Users className="h-6 w-6 text-secondary" />}
          iconBg="bg-secondary/20"
        />
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-border/50 bg-surface/30 px-8 py-4 text-center text-sm text-muted backdrop-blur-sm">
        Generated from CCF Welcome Center on {format(new Date(), 'MMM d, yyyy')}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  iconBg,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border/60 bg-surface p-6 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} mb-4`}>
        {icon}
      </div>
      <div className="mb-1 text-3xl font-bold tracking-tight text-text tabular-nums">{value}</div>
      <div className="text-sm font-medium uppercase tracking-wider text-muted">{title}</div>
    </div>
  );
}
