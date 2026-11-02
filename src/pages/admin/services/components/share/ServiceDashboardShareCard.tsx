import { format, isValid, parseISO } from 'date-fns';
import { CalendarDays, Clock, Handshake, Percent, UserCheck, UserX, Users } from 'lucide-react';

import { Badge, BrandAvatar } from '@/components/ui';
import { LEGAL_CONFIG } from '@/config/constants';
import type { DashboardStatsResponse } from '@/hooks/domain/services';
import { type ServiceTimeSlot, TIME_SLOTS } from '@/pages/admin/services/constants';

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
    };
  };

  const totalCommitted = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).committed, 0);
  const totalPresent = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).present, 0);
  const totalMissed = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).missed, 0);
  const overallTurnup = getTurnupPercentage(totalPresent, totalCommitted);
  const totalLateTardy = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).late_tardy, 0);
  const totalWalkIns = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).walk_ins, 0);

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
      style={{ width: '800px', minWidth: '800px', maxWidth: '800px' }}
      className="relative flex flex-col w-[800px] min-w-[800px] max-w-[800px] shrink-0 box-border rounded-2xl border border-border bg-surface font-sans text-text shadow-sm overflow-hidden"
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

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-3 gap-4 p-8 pb-6">
        <MetricCard
          title="Turn-Up Rate"
          value={`${overallTurnup}%`}
          icon={<Percent className="h-5 w-5 text-accent" />}
          iconBg="bg-accent/20"
        />
        <MetricCard
          title="Present Volunteers"
          value={totalPresent}
          icon={<UserCheck className="h-5 w-5 text-secondary" />}
          iconBg="bg-secondary/20"
        />
        <MetricCard
          title="Expected Volunteers"
          value={totalCommitted}
          icon={<Handshake className="h-5 w-5 text-primary" />}
          iconBg="bg-primary/20"
        />
        <MetricCard
          title="Missed Commitments"
          value={totalMissed}
          icon={<UserX className="h-5 w-5 text-danger" />}
          iconBg="bg-danger/20"
        />
        <MetricCard
          title="Late Check-In"
          value={totalLateTardy}
          icon={<Clock className="h-5 w-5 text-accent" />}
          iconBg="bg-accent/20"
        />
        <MetricCard
          title="Walk-In Attendees"
          value={totalWalkIns}
          icon={<Users className="h-5 w-5 text-secondary" />}
          iconBg="bg-secondary/20"
        />
      </div>

      {/* Service Slot Breakdown */}
      <div className="px-8 pb-6">
        <div className="overflow-hidden rounded-xl border border-border/80 bg-surface">
          <div className="border-b border-border/70 bg-surface-hover/30 px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Service Breakdown by Time Slot
            </span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/60 bg-surface-hover/10 text-xs font-semibold text-muted">
              <tr>
                <th className="px-4 py-2.5">Service Slot</th>
                <th className="px-4 py-2.5 text-center">Expected</th>
                <th className="px-4 py-2.5 text-center">Present</th>
                <th className="px-4 py-2.5 text-center">Turn-Up Rate</th>
                <th className="px-4 py-2.5 text-center">Missed</th>
                <th className="px-4 py-2.5 text-center">Late</th>
                <th className="px-4 py-2.5 text-center">Walk-In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-text">
              {TIME_SLOTS.map((ts) => {
                const slot = getSlot(ts);
                const perc = getTurnupPercentage(slot.present, slot.committed);
                return (
                  <tr key={ts} className="hover:bg-surface-hover/10">
                    <td className="px-4 py-2.5 font-semibold">{ts} Service</td>
                    <td className="px-4 py-2.5 text-center tabular-nums">{slot.committed}</td>
                    <td className="px-4 py-2.5 text-center font-medium text-secondary tabular-nums">
                      {slot.present}
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold tabular-nums">
                      <span className={perc < 50 ? 'text-danger' : 'text-primary'}>{perc}%</span>
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums">
                      <span className={slot.missed > 0 ? 'font-medium text-danger' : 'text-muted'}>
                        {slot.missed}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums">{slot.late_tardy}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums">{slot.walk_ins}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-surface-hover/20 px-8 py-3.5 text-center text-xs text-muted">
        Generated from {LEGAL_CONFIG.organizationName} on {format(new Date(), 'MMM d, yyyy')}
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
    <div className="flex flex-col items-center rounded-xl border border-border/70 bg-surface-hover/20 p-4 shadow-2xs">
      <div className={`mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
        {icon}
      </div>
      <div className="mb-0.5 text-2xl font-bold tracking-tight text-text tabular-nums">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</div>
    </div>
  );
}
