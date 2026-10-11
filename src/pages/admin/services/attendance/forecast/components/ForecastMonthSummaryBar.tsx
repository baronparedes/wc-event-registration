import { CalendarCheck2, CheckCircle2, TrendingUp, Users } from 'lucide-react';

import type { MonthForecastSummary } from '../hooks/useAttendanceForecastData';

export type ForecastMonthSummaryBarProps = {
  summary: MonthForecastSummary;
};

export function ForecastMonthSummaryBar({ summary }: ForecastMonthSummaryBarProps) {
  const isAllMet = summary.sundaysWithDeficit === 0 && summary.totalTarget > 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Total Sundays */}
      <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted">Sundays in Month</span>
          <CalendarCheck2 className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-text tabular-nums">{summary.totalSundays}</div>
          <p className="text-[11px] text-muted mt-0.5">Evaluated Sunday services</p>
        </div>
      </div>

      {/* Target Quota */}
      <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted">Total Monthly Quota</span>
          <Users className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-text tabular-nums">{summary.totalTarget}</div>
          <p className="text-[11px] text-muted mt-0.5">Sum of Sunday role targets</p>
        </div>
      </div>

      {/* Expected Turnup */}
      <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted">Expected Turnup</span>
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-text tabular-nums">
            ~{summary.totalExpectedTurnup}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted">
            <span>Fulfillment:</span>
            <strong className="font-semibold text-text tabular-nums">
              {summary.averageFulfillmentPercentage}%
            </strong>
          </div>
        </div>
      </div>

      {/* Targets Status */}
      <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted">Staffing Status</span>
          <CheckCircle2
            className={`h-4 w-4 ${isAllMet ? 'text-emerald-500' : 'text-amber-500'}`}
            aria-hidden="true"
          />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-text tabular-nums">
            {summary.sundaysMeetingTarget} / {summary.totalSundays}
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            {isAllMet
              ? 'All Sundays meet targets'
              : `${summary.sundaysWithDeficit} Sunday${summary.sundaysWithDeficit === 1 ? '' : 's'} with deficit`}
          </p>
        </div>
      </div>
    </div>
  );
}
