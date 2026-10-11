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
  totalDeficit?: number;
  totalSurplus?: number;
};

export function SundayCommitmentTable({
  title,
  sessions,
  totalTarget,
  totalScheduled,
  totalConfirmed,
  totalOverShort,
  totalDeficit,
  totalSurplus,
}: SundayCommitmentTableProps) {
  const isTotalNegative = totalOverShort < 0;
  const isTotalPositive = totalOverShort > 0;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
      {/* Table Banner Title */}
      <div className="flex items-center justify-center gap-2 border-b border-border bg-surface-hover/50 px-4 py-3 text-center">
        <Users className="h-4 w-4 text-primary" aria-hidden="true" />
        <h4 className="text-sm font-bold tracking-wider text-text uppercase">{title}</h4>
      </div>

      {/* Shared UI Primitive ListTable with Fixed Equal Column Widths */}
      <ListTable density="dense" className="w-full table-fixed text-center">
        <ListTableHead>
          <ListTableHeaderRow variant="default">
            <ListTableHeaderCell className="w-1/5 text-center text-xs font-bold uppercase tracking-wider text-muted">
              SESSION
            </ListTableHeaderCell>
            <ListTableHeaderCell className="w-1/5 text-center text-xs font-bold uppercase tracking-wider text-muted">
              TARGET
            </ListTableHeaderCell>
            <ListTableHeaderCell className="w-1/5 text-center text-xs font-bold uppercase tracking-wider text-muted">
              SCHEDULED
            </ListTableHeaderCell>
            <ListTableHeaderCell className="w-1/5 text-center text-xs font-bold uppercase tracking-wider text-muted">
              EXPECTED
            </ListTableHeaderCell>
            <ListTableHeaderCell className="w-1/5 text-center text-xs font-bold uppercase tracking-wider text-muted">
              VARIANCE
            </ListTableHeaderCell>
          </ListTableHeaderRow>
        </ListTableHead>

        <ListTableBody divider="default">
          {sessions.map((session) => {
            const isNegative = session.overShort < 0;
            const isPositive = session.overShort > 0;

            return (
              <ListTableRow key={session.slot} hover="muted">
                <ListTableCell className="w-1/5 text-center text-sm font-semibold text-text">
                  {session.slot}
                </ListTableCell>
                <ListTableCell className="w-1/5 text-center text-sm font-semibold text-text tabular-nums">
                  {session.target}
                </ListTableCell>
                <ListTableCell className="w-1/5 text-center text-sm font-semibold text-text tabular-nums">
                  {session.scheduled}
                </ListTableCell>
                <ListTableCell className="w-1/5 text-center text-sm font-semibold text-text tabular-nums">
                  {session.confirmed}
                </ListTableCell>
                <ListTableCell className="w-1/5 text-center text-sm font-semibold tabular-nums">
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
                      isNegative
                        ? 'bg-danger/10 text-danger'
                        : isPositive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted/10 text-muted font-semibold'
                    }`}
                  >
                    {isPositive ? `+${session.overShort}` : session.overShort}
                  </span>
                </ListTableCell>
              </ListTableRow>
            );
          })}

          {/* Total Summary Row */}
          <ListTableRow
            hover="none"
            className="border-t-2 border-border bg-surface-hover/60 text-center font-bold"
          >
            <ListTableCell className="w-1/5 text-center text-sm font-bold uppercase tracking-wider text-text">
              TOTAL
            </ListTableCell>
            <ListTableCell className="w-1/5 text-center text-sm font-bold text-text tabular-nums">
              {totalTarget}
            </ListTableCell>
            <ListTableCell className="w-1/5 text-center text-sm font-bold text-text tabular-nums">
              {totalScheduled}
            </ListTableCell>
            <ListTableCell className="w-1/5 text-center text-sm font-bold text-text tabular-nums">
              {totalConfirmed}
            </ListTableCell>
            <ListTableCell className="w-1/5 text-center text-sm font-bold tabular-nums">
              {totalDeficit !== undefined && totalDeficit > 0 ? (
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums bg-danger/15 text-danger">
                    -{totalDeficit} Short
                  </span>
                  {totalSurplus !== undefined && totalSurplus > 0 && (
                    <span className="text-[10px] text-muted font-medium">
                      (+{totalSurplus} surplus)
                    </span>
                  )}
                </div>
              ) : (
                <span
                  className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
                    isTotalNegative
                      ? 'bg-danger/15 text-danger'
                      : isTotalPositive
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted/15 text-text font-bold'
                  }`}
                >
                  {isTotalPositive ? `+${totalOverShort}` : totalOverShort}
                </span>
              )}
            </ListTableCell>
          </ListTableRow>
        </ListTableBody>
      </ListTable>
    </div>
  );
}
