import { Badge } from '@/components/ui';

import type { SlotConfidenceForecast } from './hubCalendarForecastUtils';

export type SlotConfidenceForecastBannerProps = {
  forecast: SlotConfidenceForecast;
};

export function SlotConfidenceForecastBanner({ forecast }: SlotConfidenceForecastBannerProps) {
  if (forecast.totalCommitted === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-surface-hover/60 border border-border/60 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-text">
          Realistic Expected Turnup:{' '}
          <strong className="font-bold text-text">
            ~{forecast.expectedTurnup} / {forecast.totalCommitted}
          </strong>
        </span>
        <Badge variant="primaryOutline" className="text-[11px] px-2 py-0 font-semibold">
          {forecast.confidencePercentage}% confidence
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-muted">
        <span
          className="inline-flex items-center gap-1.5 font-medium"
          title="Historical turnup rate ≥ 80%"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-text font-semibold">{forecast.highCount}</span> Solid
        </span>

        {forecast.moderateCount > 0 && (
          <span
            className="inline-flex items-center gap-1.5 font-medium"
            title="Historical turnup rate 50% - 79%"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-text font-semibold">{forecast.moderateCount}</span> Moderate
          </span>
        )}

        {forecast.atRiskCount > 0 && (
          <span
            className="inline-flex items-center gap-1.5 font-medium"
            title="Historical turnup rate < 50%"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
            <span className="text-text font-semibold">{forecast.atRiskCount}</span> At Risk
          </span>
        )}

        {forecast.excusedCount > 0 && (
          <span
            className="inline-flex items-center gap-1.5 font-medium"
            title="Excused absences filed for this slot"
          >
            <span className="h-2 w-2 rounded-full bg-muted shrink-0" />
            <span className="text-text font-semibold">{forecast.excusedCount}</span> Excused
          </span>
        )}
      </div>
    </div>
  );
}
