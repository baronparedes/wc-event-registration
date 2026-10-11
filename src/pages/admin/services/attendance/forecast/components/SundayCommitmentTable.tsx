import { Users } from 'lucide-react';

import type { SundaySessionForecast } from '../hooks/useAttendanceForecastData';

export type SundayCommitmentTableProps = {
  title: string;
  sessions: SundaySessionForecast[];
  totalTarget: number;
  totalScheduled: number;
  totalConfirmed: number;
  totalOverShort: number;
};

export function SundayCommitmentTable({
  title,
  sessions,
  totalTarget,
  totalScheduled,
  totalConfirmed,
  totalOverShort,
}: SundayCommitmentTableProps) {
  const isTotalNegative = totalOverShort < 0;
  const isTotalPositive = totalOverShort > 0;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-white dark:bg-surface shadow-xs">
      {/* Table Banner Title */}
      <div className="flex items-center justify-between border-b border-border bg-surface-hover/50 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-4 w-4" aria-hidden="true" />
          </div>
          <h4 className="text-xs sm:text-sm font-bold tracking-wider text-text uppercase">
            {title}
          </h4>
        </div>
        <span className="text-[11px] font-medium text-muted">Slot Breakdown</span>
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-hover/30 text-xs font-semibold uppercase tracking-wider text-muted">
              <th scope="col" className="border-r border-border/60 px-4 py-3 text-center">
                SESSION
              </th>
              <th scope="col" className="border-r border-border/60 px-4 py-3 text-center">
                TARGET
              </th>
              <th scope="col" className="border-r border-border/60 px-4 py-3 text-center">
                SCHEDULED
              </th>
              <th scope="col" className="border-r border-border/60 px-4 py-3 text-center">
                CONFIRMED
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Over</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">[/Short]</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sessions.map((session) => {
              const isNegative = session.overShort < 0;
              const isPositive = session.overShort > 0;

              return (
                <tr
                  key={session.slot}
                  className="text-center font-medium transition-colors hover:bg-surface-hover/40"
                >
                  <td className="border-r border-border/60 px-4 py-3 font-semibold text-text">
                    {session.slot}
                  </td>
                  <td className="border-r border-border/60 px-4 py-3 text-muted tabular-nums">
                    {session.target}
                  </td>
                  <td className="border-r border-border/60 px-4 py-3 text-muted tabular-nums">
                    {session.scheduled}
                  </td>
                  <td className="border-r border-border/60 px-4 py-3 text-text tabular-nums font-semibold">
                    {session.confirmed}
                  </td>
                  <td
                    className={`px-4 py-3 font-bold text-base tabular-nums transition-colors ${
                      isNegative
                        ? 'bg-rose-500/10 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                        : isPositive
                          ? 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : 'bg-surface-hover/20 text-muted font-semibold'
                    }`}
                  >
                    {isPositive ? `+${session.overShort}` : session.overShort}
                  </td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr className="border-t-2 border-border bg-surface-hover/60 text-center font-bold">
              <td className="border-r border-border/60 px-4 py-3 text-text font-bold uppercase tracking-wider text-xs">
                TOTAL
              </td>
              <td className="border-r border-border/60 px-4 py-3 text-text tabular-nums font-bold">
                {totalTarget}
              </td>
              <td className="border-r border-border/60 px-4 py-3 text-text tabular-nums font-bold">
                {totalScheduled}
              </td>
              <td className="border-r border-border/60 px-4 py-3 text-text tabular-nums font-bold">
                {totalConfirmed}
              </td>
              <td
                className={`px-4 py-3 font-black text-base tabular-nums transition-colors ${
                  isTotalNegative
                    ? 'bg-rose-500/15 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                    : isTotalPositive
                      ? 'bg-emerald-500/15 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-surface-hover/40 text-text font-bold'
                }`}
              >
                {isTotalPositive ? `+${totalOverShort}` : totalOverShort}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
