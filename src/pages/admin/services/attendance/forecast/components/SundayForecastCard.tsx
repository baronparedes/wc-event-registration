import { Calendar, CheckCircle2 } from 'lucide-react';

import { Badge } from '@/components/ui';

import type { SundayForecastData } from '../hooks/useAttendanceForecastData';

export type SundayForecastCardProps = {
  sunday: SundayForecastData;
};

export function SundayForecastCard({ sunday }: SundayForecastCardProps) {
  const { forecast, totalScheduled, ordinalLabel, formattedDate } = sunday;
  const hasDeficit = forecast.totalNeeded > 0;

  return (
    <article className="flex flex-col rounded-xl border border-border bg-white dark:bg-surface shadow-2xs overflow-hidden transition-all">
      {/* Header */}
      <div className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-white dark:bg-surface">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                {ordinalLabel}
              </Badge>
              <h3 className="text-base font-bold text-text truncate">{formattedDate}</h3>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Service roster projection and role deficit breakdown
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-auto">
          {hasDeficit ? (
            <Badge variant="accent">{forecast.totalNeeded} Still Needed</Badge>
          ) : (
            <Badge>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5 inline" />
              Target Met
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Overall Summary Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 rounded-xl bg-surface-hover/40 border border-border/60 p-3.5 text-xs">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="inline-flex items-center gap-1.5">
              <span className="text-muted">Total Target:</span>
              <strong className="font-semibold text-text">{forecast.totalTarget}</strong>
            </div>

            <div className="inline-flex items-center gap-1.5">
              <span className="text-muted">Expected Turnup:</span>
              <strong className="font-semibold text-text">~{forecast.totalExpectedTurnup}</strong>
              <span className="text-[11px] text-muted">
                ({forecast.totalCommitted} scheduled
                {forecast.totalExcused > 0 ? `, ${forecast.totalExcused} excused` : ''})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-2 pt-1 lg:pt-0 shrink-0">
            <span className="text-muted">Fulfillment:</span>
            <div className="h-2 flex-1 sm:w-36 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  !hasDeficit ? 'bg-emerald-500' : 'bg-primary'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, forecast.overallFulfillmentPercentage))}%`,
                }}
              />
            </div>
            <strong className="font-semibold text-text tabular-nums">
              {forecast.overallFulfillmentPercentage}%
            </strong>
          </div>
        </div>

        {/* Role Breakdown Grid */}
        {totalScheduled === 0 && forecast.totalCommitted === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-surface-hover/20 p-6 text-center text-xs text-muted">
            No volunteer commitments scheduled for this Sunday yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {forecast.roleBreakdown.map((item) => {
              const isFilled = item.needed === 0 && item.target > 0;
              const roleDeficit = item.needed > 0;

              return (
                <div
                  key={item.role}
                  className="flex flex-col justify-between rounded-xl border border-border bg-white dark:bg-surface p-3.5 transition-colors shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs text-text truncate" title={item.role}>
                      {item.role}
                    </span>
                    {roleDeficit ? (
                      <Badge variant="accent">Need {item.needed}</Badge>
                    ) : isFilled ? (
                      <Badge>Filled</Badge>
                    ) : (
                      <Badge variant="primaryOutline">No Target</Badge>
                    )}
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-muted text-[11px]">
                      <span>Target: {item.target}</span>
                      <span className="font-semibold text-text">
                        ~{item.expectedTurnup} expected
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          roleDeficit ? 'bg-accent' : isFilled ? 'bg-primary' : 'bg-muted'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, item.fulfillmentPercentage))}%`,
                        }}
                      />
                    </div>

                    <p className="text-[10px] text-muted truncate">
                      {item.committed} scheduled
                      {item.excused > 0 ? ` • ${item.excused} excused` : ''}
                    </p>
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
