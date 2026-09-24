import { Briefcase, Pointer } from 'lucide-react';

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
      subtitle="Volunteer counts per role across service time slots • Click any count to view records"
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
                <div className="mt-3 grid grid-cols-3 divide-x divide-border/60 rounded-lg border border-border/60 bg-surface py-1">
                  {TIME_SLOTS.map((ts) => {
                    const count = getSlot(ts).roles?.[role] || 0;
                    const isClickable = count > 0;
                    return (
                      <button
                        key={ts}
                        type="button"
                        onClick={() => handleRoleDrillDown(role, ts)}
                        disabled={!isClickable}
                        className={`group flex flex-col items-center px-1 py-1.5 text-center transition-colors ${
                          isClickable
                            ? 'cursor-pointer hover:bg-primary/10'
                            : 'cursor-default opacity-40'
                        }`}
                        title={
                          isClickable
                            ? `View ${role} attendance for ${ts} (opens in new tab)`
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium text-muted">{ts}</span>
                          {isClickable && (
                            <Pointer className="h-2.5 w-2.5 text-muted/50 transition-transform group-hover:scale-110 group-hover:text-primary" />
                          )}
                        </div>
                        <span className="font-heading text-base font-bold text-text transition-colors group-hover:text-primary">
                          {count}
                        </span>
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
