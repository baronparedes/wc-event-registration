import { Users } from 'lucide-react';

import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui';

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

      {/* Shared UI Primitive ListTable */}
      <ListTable density="dense" className="w-full text-center">
        <ListTableHead>
          <ListTableHeaderRow variant="default">
            <ListTableHeaderCell className="text-center font-bold">SESSION</ListTableHeaderCell>
            <ListTableHeaderCell className="text-center font-bold">TARGET</ListTableHeaderCell>
            <ListTableHeaderCell className="text-center font-bold">SCHEDULED</ListTableHeaderCell>
            <ListTableHeaderCell className="text-center font-bold">CONFIRMED</ListTableHeaderCell>
            <ListTableHeaderCell className="text-center font-bold">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Over</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">[/Short]</span>
            </ListTableHeaderCell>
          </ListTableHeaderRow>
        </ListTableHead>

        <ListTableBody divider="default">
          {sessions.map((session) => {
            const isNegative = session.overShort < 0;
            const isPositive = session.overShort > 0;

            return (
              <ListTableRow key={session.slot} hover="muted">
                <ListTableCell className="font-semibold text-text text-center">
                  {session.slot}
                </ListTableCell>
                <ListTableCell className="text-muted tabular-nums text-center">
                  {session.target}
                </ListTableCell>
                <ListTableCell className="text-muted tabular-nums text-center">
                  {session.scheduled}
                </ListTableCell>
                <ListTableCell className="text-text tabular-nums font-semibold text-center">
                  {session.confirmed}
                </ListTableCell>
                <ListTableCell
                  className={`font-bold text-base tabular-nums text-center transition-colors ${
                    isNegative
                      ? 'bg-rose-500/10 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      : isPositive
                        ? 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-surface-hover/20 text-muted font-semibold'
                  }`}
                >
                  {isPositive ? `+${session.overShort}` : session.overShort}
                </ListTableCell>
              </ListTableRow>
            );
          })}

          {/* Total Summary Row */}
          <ListTableRow
            hover="none"
            className="border-t-2 border-border bg-surface-hover/60 font-bold text-center"
          >
            <ListTableCell className="text-text font-bold uppercase tracking-wider text-xs text-center">
              TOTAL
            </ListTableCell>
            <ListTableCell className="text-text tabular-nums font-bold text-center">
              {totalTarget}
            </ListTableCell>
            <ListTableCell className="text-text tabular-nums font-bold text-center">
              {totalScheduled}
            </ListTableCell>
            <ListTableCell className="text-text tabular-nums font-bold text-center">
              {totalConfirmed}
            </ListTableCell>
            <ListTableCell
              className={`font-black text-base tabular-nums text-center transition-colors ${
                isTotalNegative
                  ? 'bg-rose-500/15 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                  : isTotalPositive
                    ? 'bg-emerald-500/15 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : 'bg-surface-hover/40 text-text font-bold'
              }`}
            >
              {isTotalPositive ? `+${totalOverShort}` : totalOverShort}
            </ListTableCell>
          </ListTableRow>
        </ListTableBody>
      </ListTable>
    </div>
  );
}
