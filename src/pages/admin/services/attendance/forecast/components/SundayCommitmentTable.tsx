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
    <div className="w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
      {/* Table Banner Title */}
      <div className="flex items-center justify-center gap-2 border-b border-border bg-surface-hover/50 px-4 py-2.5 text-center">
        <Users className="h-4 w-4 text-primary" aria-hidden="true" />
        <h4 className="text-xs sm:text-sm font-bold tracking-wider text-text uppercase">{title}</h4>
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
              <span className="text-primary font-bold">Over</span>
              <span className="text-danger font-bold">[/Short]</span>
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
                <ListTableCell className="text-center">
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
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
            <ListTableCell className="text-center">
              <span
                className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-black tabular-nums ${
                  isTotalNegative
                    ? 'bg-danger/15 text-danger'
                    : isTotalPositive
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted/15 text-text font-bold'
                }`}
              >
                {isTotalPositive ? `+${totalOverShort}` : totalOverShort}
              </span>
            </ListTableCell>
          </ListTableRow>
        </ListTableBody>
      </ListTable>
    </div>
  );
}
