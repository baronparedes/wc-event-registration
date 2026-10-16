import { useState } from 'react';

import { BarChart3, Calendar, CheckCircle2, Clock, Table } from 'lucide-react';

import { Badge, ButtonGroup } from '@/components/ui';

import type { SundayForecastData } from '../hooks/useAttendanceForecastData';
import { SundayCommitmentChart } from './SundayCommitmentChart';
import { SundayCommitmentTable } from './SundayCommitmentTable';
import { getSessionTheme } from './sessionThemes';

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

      {/* Unified Top Summary Banner & Quick-Jump Navigation */}
      <div className="border-b border-border bg-surface-hover/20 px-4 py-3.5 sm:px-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col rounded-lg border border-border/70 bg-surface p-3 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Target
            </span>
            <span className="mt-1 text-lg sm:text-xl font-bold tabular-nums text-text">
              {totalTarget}
            </span>
          </div>

          <div className="flex flex-col rounded-lg border border-border/70 bg-surface p-3 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Scheduled
            </span>
            <span className="mt-1 text-lg sm:text-xl font-bold tabular-nums text-text">
              {totalScheduled}
            </span>
          </div>

          <div className="flex flex-col rounded-lg border border-border/70 bg-surface p-3 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Expected
            </span>
            <span className="mt-1 text-lg sm:text-xl font-bold tabular-nums text-text">
              ~{totalConfirmed}
            </span>
          </div>

          <div className="flex flex-col rounded-lg border border-border/70 bg-surface p-3 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Staffing Status
            </span>
            <div className="mt-1 flex items-center">
              {hasDeficit ? (
                <Badge variant="accent" className="font-bold text-xs px-2.5 py-0.5">
                  {totalDeficit} Short
                </Badge>
              ) : (
                <Badge className="font-bold text-xs px-2.5 py-0.5">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5 inline" />
                  Target Met{totalSurplus > 0 ? ` (+${totalSurplus})` : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body: Table or Chart Layout */}
      <div className="p-4 sm:p-5 space-y-4">
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
            <div className="pt-4 border-t border-border/60 space-y-5">
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Individual Role Breakdown
              </div>

              {(forecast.slotBreakdowns && forecast.slotBreakdowns.length > 0
                ? forecast.slotBreakdowns
                : [forecast]
              ).map((slotGroup) => {
                const slotKey =
                  slotGroup.slot ?? (sessions.length === 1 ? sessions[0].slot : 'ALL');
                const theme = getSessionTheme(slotKey);
                const slotLabel = theme.slotLabel;
                const slotTitle = slotKey === 'ALL' ? 'All Sessions' : `${slotLabel} Session`;
                const slotNeeded = slotGroup.totalNeeded ?? 0;
                const slotTarget = slotGroup.totalTarget ?? 0;
                const slotExpected = slotGroup.totalExpectedTurnup ?? 0;
                const isSlotFilled = slotNeeded === 0 && slotTarget > 0;
                const slotDeficit = slotNeeded > 0;

                return (
                  <section
                    key={slotKey}
                    id={`sunday-${sunday.isoDateKey}-slot-${slotKey}`}
                    className={`scroll-mt-4 rounded-xl border border-border/80 border-l-4 ${theme.borderAccent} bg-surface-hover/10 p-3 sm:p-4 space-y-3`}
                  >
                    {/* Session Header Strip */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2.5 border-b border-border/60">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-md ${theme.iconBg}`}
                        >
                          <Clock className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-text uppercase tracking-wide">
                            {slotTitle}
                          </h4>
                          <span
                            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.badge}`}
                          >
                            {theme.tag}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {slotTarget > 0 && (
                          <span className="text-xs text-muted font-medium">
                            Target:{' '}
                            <strong className="font-semibold text-text tabular-nums">
                              {slotTarget}
                            </strong>{' '}
                            &bull; Expected:{' '}
                            <strong className="font-semibold text-text tabular-nums">
                              ~{slotExpected}
                            </strong>
                          </span>
                        )}
                        {slotDeficit ? (
                          <Badge
                            variant="accent"
                            className="text-xs px-2 py-0.5 font-bold whitespace-nowrap"
                          >
                            {slotNeeded} Short
                          </Badge>
                        ) : isSlotFilled ? (
                          <Badge className="text-xs px-2 py-0.5 font-bold whitespace-nowrap">
                            Target Met
                          </Badge>
                        ) : (
                          <Badge
                            variant="primaryOutline"
                            className="text-xs px-2 py-0.5 whitespace-nowrap"
                          >
                            No Target
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {slotGroup.roleBreakdown.map((item) => {
                        const isFilled = item.needed === 0 && item.target > 0;
                        const roleDeficit = item.needed > 0;
                        const percent =
                          item.fulfillmentPercentage ??
                          (item.target > 0
                            ? Math.min(100, Math.round((item.expectedTurnup / item.target) * 100))
                            : 100);

                        return (
                          <div
                            key={item.role}
                            className="flex flex-col justify-between rounded-xl border border-border bg-surface p-3 shadow-2xs transition-all hover:border-border-hover hover:shadow-xs"
                          >
                            {/* Top Row: Role Name Bold on Left, Status Badge on Right */}
                            <div className="flex items-start justify-between gap-2 min-h-[34px]">
                              <span
                                className="text-sm font-bold text-text leading-tight break-words"
                                title={item.role}
                              >
                                {item.role}
                              </span>
                              {roleDeficit ? (
                                <Badge
                                  variant="accent"
                                  className="text-xs px-2 py-0.5 shrink-0 self-start font-bold whitespace-nowrap"
                                >
                                  Need {item.needed}
                                </Badge>
                              ) : isFilled ? (
                                <Badge className="text-xs px-2 py-0.5 shrink-0 self-start font-bold whitespace-nowrap">
                                  Filled
                                </Badge>
                              ) : (
                                <Badge
                                  variant="primaryOutline"
                                  className="text-xs px-2 py-0.5 shrink-0 self-start font-medium whitespace-nowrap"
                                >
                                  No Target
                                </Badge>
                              )}
                            </div>

                            {/* Bottom Row: Soft Pill Container with Metrics & Mini Color-Coded Progress Bar */}
                            <div className="mt-2.5 flex flex-col gap-1.5 rounded-lg border border-border/50 bg-surface-hover/50 p-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-muted font-medium whitespace-nowrap">
                                  Target:{' '}
                                  <strong className="font-bold text-text tabular-nums">
                                    {item.target}
                                  </strong>
                                </span>
                                <span className="font-semibold text-text tabular-nums whitespace-nowrap">
                                  ~{item.expectedTurnup} expected
                                </span>
                              </div>

                              {/* Mini Progress Bar */}
                              {item.target > 0 && (
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      percent >= 100
                                        ? 'bg-emerald-500'
                                        : percent >= 70
                                          ? 'bg-amber-500'
                                          : 'bg-danger'
                                    }`}
                                    style={{ width: `${percent}%` }}
                                    role="progressbar"
                                    aria-valuenow={percent}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`${item.role} staffing fulfillment`}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
      </div>
    </article>
  );
}
