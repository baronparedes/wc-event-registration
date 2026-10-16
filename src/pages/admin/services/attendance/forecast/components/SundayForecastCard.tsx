import { useState } from 'react';

import { BarChart3, Calendar, CheckCircle2, Table } from 'lucide-react';

import { Badge, ButtonGroup } from '@/components/ui';

import type { SundayForecastData } from '../hooks/useAttendanceForecastData';
import { SundayCommitmentChart } from './SundayCommitmentChart';
import { SundayCommitmentTable } from './SundayCommitmentTable';

export type SundayForecastCardProps = {
  sunday: SundayForecastData;
  tableTitle?: string;
  showRoleBreakdownOption?: boolean;
};

export function SundayForecastCard({
  sunday,
  tableTitle,
  showRoleBreakdownOption = true,
}: SundayForecastCardProps) {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('chart');
  const {
    ordinalLabel,
    formattedDate,
    sessions,
    totalTarget,
    totalScheduled,
    totalConfirmed,
    totalOverShort,
    totalDeficit,
    totalSurplus,
    hasDeficit,
    forecast,
  } = sunday;

  const resolvedTableTitle = tableTitle ?? 'ALL VOLUNTEER COMMITMENTS';

  return (
    <article className="flex flex-col rounded-xl border border-border bg-surface shadow-xs overflow-hidden transition-all">
      {/* Header */}
      <div className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-surface">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="text-xs font-semibold">
                {ordinalLabel}
              </Badge>
              <h3 className="text-base font-bold text-text truncate">{formattedDate}</h3>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Service roster projection and role deficit breakdown
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
          {/* Table / Chart View Mode Toggle */}
          <ButtonGroup<'table' | 'chart'>
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="View mode toggle"
            size="sm"
          >
            <ButtonGroup.Item value="table" icon={<Table className="h-3.5 w-3.5" />}>
              Table
            </ButtonGroup.Item>
            <ButtonGroup.Item value="chart" icon={<BarChart3 className="h-3.5 w-3.5" />}>
              Chart
            </ButtonGroup.Item>
          </ButtonGroup>

          {/* Overall Deficit / Target Badge */}
          {hasDeficit ? (
            <Badge variant="accent">{totalDeficit} Short</Badge>
          ) : (
            <Badge>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5 inline" />
              Target Met{totalSurplus > 0 ? ` (+${totalSurplus})` : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Body: Table or Chart Layout */}
      <div className="p-4 sm:p-5 space-y-3">
        {viewMode === 'table' ? (
          <SundayCommitmentTable
            title={resolvedTableTitle}
            sessions={sessions}
            totalTarget={totalTarget}
            totalScheduled={totalScheduled}
            totalConfirmed={totalConfirmed}
            totalOverShort={totalOverShort}
            totalDeficit={totalDeficit}
            totalSurplus={totalSurplus}
          />
        ) : (
          <SundayCommitmentChart
            title={resolvedTableTitle}
            sessions={sessions}
            totalTarget={totalTarget}
            totalScheduled={totalScheduled}
            totalConfirmed={totalConfirmed}
            totalOverShort={totalOverShort}
            totalDeficit={totalDeficit}
            totalSurplus={totalSurplus}
          />
        )}

        <p className="text-[11px] text-muted text-center">
          * <span className="font-semibold">EXPECTED</span> represents expected attendance turnup
          forecasted from 3-month attendance confidence scores.
        </p>

        {/* Individual Role Breakdown - always visible when All Roles are selected */}
        {showRoleBreakdownOption &&
          forecast &&
          Boolean(forecast.slotBreakdowns?.length || forecast.roleBreakdown?.length) && (
            <div className="pt-4 border-t border-border/60 space-y-4">
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Individual Role Breakdown
              </div>

              {(forecast.slotBreakdowns && forecast.slotBreakdowns.length > 0
                ? forecast.slotBreakdowns
                : [forecast]
              ).map((slotGroup) => {
                const slotKey = slotGroup.slot ?? 'ALL';
                const slotLabel =
                  slotKey === '9AM'
                    ? '9 AM'
                    : slotKey === '12NN'
                      ? '12 NN'
                      : slotKey === '3PM'
                        ? '3 PM'
                        : slotKey;
                const slotTitle = slotKey === 'ALL' ? 'All Sessions' : `${slotLabel} Session`;
                const slotNeeded = slotGroup.totalNeeded ?? 0;
                const slotTarget = slotGroup.totalTarget ?? 0;
                const isSlotFilled = slotNeeded === 0 && slotTarget > 0;
                const slotDeficit = slotNeeded > 0;

                return (
                  <div key={slotKey} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text uppercase tracking-wide">
                        {slotTitle}
                      </span>
                      {slotDeficit ? (
                        <Badge variant="accent" className="text-xs px-2 py-0.5">
                          {slotNeeded} Short
                        </Badge>
                      ) : isSlotFilled ? (
                        <Badge className="text-xs px-2 py-0.5">Target Met</Badge>
                      ) : (
                        <Badge variant="primaryOutline" className="text-xs px-2 py-0.5">
                          No Target
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                      {slotGroup.roleBreakdown.map((item) => {
                        const isFilled = item.needed === 0 && item.target > 0;
                        const roleDeficit = item.needed > 0;

                        return (
                          <div
                            key={item.role}
                            className="flex flex-col justify-between rounded-lg border border-border bg-surface-hover/20 p-3 sm:p-3.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="text-base font-semibold text-text truncate"
                                title={item.role}
                              >
                                {item.role}
                              </span>
                              {roleDeficit ? (
                                <Badge variant="accent" className="text-sm px-2 py-0.5 shrink-0">
                                  Need {item.needed}
                                </Badge>
                              ) : isFilled ? (
                                <Badge className="text-sm px-2 py-0.5 shrink-0">Filled</Badge>
                              ) : (
                                <Badge
                                  variant="primaryOutline"
                                  className="text-sm px-2 py-0.5 shrink-0"
                                >
                                  No Target
                                </Badge>
                              )}
                            </div>

                            <div className="mt-3 text-sm text-muted flex items-center justify-between">
                              <span>Target: {item.target}</span>
                              <span className="font-medium text-text">
                                ~{item.expectedTurnup} exp
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </article>
  );
}
