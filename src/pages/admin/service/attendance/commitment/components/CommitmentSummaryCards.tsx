import { useMemo } from 'react';

import type { CommitmentDashboardStat } from '@/hooks/domain/services';

interface CommitmentSummaryCardsProps {
  stats: CommitmentDashboardStat[];
  totalVolunteers: number;
}

export function CommitmentSummaryCards({ stats, totalVolunteers }: CommitmentSummaryCardsProps) {
  const totals = useMemo(() => {
    return stats.reduce(
      (acc, stat) => {
        acc.attended += stat.attended;
        acc.absences += stat.absences;
        acc.excused += stat.excused;
        acc.walkIns += stat.wi_9am_3pm + stat.wi_12nn;
        if (stat.committed > 0 || stat.attended > 0) {
          acc.activeVolunteers += 1;
        }
        return acc;
      },
      { attended: 0, absences: 0, excused: 0, walkIns: 0, activeVolunteers: 0 },
    );
  }, [stats]);

  const avgAttendance =
    totals.activeVolunteers > 0 ? (totals.attended / totals.activeVolunteers).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Volunteers
        </div>
        <div className="mt-2 text-3xl font-black text-foreground">{totalVolunteers}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {totals.activeVolunteers} with activity
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Attended
        </div>
        <div className="mt-2 text-3xl font-black text-foreground">{totals.attended}</div>
        <div className="mt-1 text-xs text-muted-foreground">committed slots</div>
      </div>

      <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Absences
        </div>
        <div className="mt-2 text-3xl font-black text-foreground">{totals.absences}</div>
        <div className="mt-1 text-xs text-muted-foreground">missed commitments</div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Excused
        </div>
        <div className="mt-2 text-3xl font-black text-foreground">{totals.excused}</div>
        <div className="mt-1 text-xs text-muted-foreground">slots scored at -0.5</div>
      </div>

      <div className="rounded-xl border border-orange-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Walk-ins
        </div>
        <div className="mt-2 text-3xl font-black text-foreground">{totals.walkIns}</div>
        <div className="mt-1 text-xs text-muted-foreground">9AM/3PM & 12NN</div>
      </div>

      <div className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Avg Attendance
        </div>
        <div className="mt-2 text-3xl font-black text-foreground">{avgAttendance}</div>
        <div className="mt-1 text-xs text-muted-foreground">per active volunteer</div>
      </div>
    </div>
  );
}
