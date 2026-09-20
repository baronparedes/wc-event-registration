import { Briefcase } from 'lucide-react';

import { Badge, SectionCard } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import type { DashboardStatsResponse } from '@/hooks/domain/services';

import { type ServiceTimeSlot, TIME_SLOTS } from '../constants';

interface ServiceDashboardRoleBreakdownProps {
  stats: DashboardStatsResponse;
  dateFilterParams: URLSearchParams;
}

export function ServiceDashboardRoleBreakdown({
  stats,
  dateFilterParams,
}: ServiceDashboardRoleBreakdownProps) {
  const handleRoleDrillDown = (role: string, ts: ServiceTimeSlot) => {
    const params = new URLSearchParams(dateFilterParams);
    params.set('role', role);
    params.set('time_slot', ts);

    // We open in a new tab
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

  const roles = stats.roles ?? [];

  return (
    <SectionCard
      title="Attendance by Role"
      subtitle="Volunteer counts per role across service time slots"
      contentClassName="mt-4"
    >
      {roles.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted">
          No volunteer roles recorded for this period.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => {
            const roleTotal = TIME_SLOTS.reduce(
              (sum, ts) => sum + (getSlot(ts).roles?.[role] || 0),
              0,
            );
            return (
              <div
                key={role}
                className="flex flex-col justify-between rounded-xl border border-border bg-background p-4 shadow-xs transition hover:border-primary/40 hover:bg-surface"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Briefcase className="h-3.5 w-3.5" />
                    </div>
                    <h4
                      className="truncate font-heading text-sm font-semibold text-text"
                      title={role}
                    >
                      {role}
                    </h4>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[11px]">
                    {roleTotal}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 divide-x divide-border/60 rounded-lg border border-border/60 bg-surface py-2">
                  {TIME_SLOTS.map((ts) => {
                    const count = getSlot(ts).roles?.[role] || 0;
                    return (
                      <button
                        key={ts}
                        type="button"
                        onClick={() => handleRoleDrillDown(role, ts)}
                        disabled={count === 0}
                        className="flex flex-col items-center px-1 text-center hover:bg-black/5 disabled:opacity-50 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-default"
                        title={count > 0 ? `View ${role} attendance for ${ts}` : undefined}
                      >
                        <span className="text-[10px] font-medium text-muted">{ts}</span>
                        <span className="font-heading text-base font-bold text-text">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
