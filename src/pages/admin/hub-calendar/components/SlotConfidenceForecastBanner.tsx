import { Badge } from '@/components/ui';

import type { SlotConfidenceForecast } from './hubCalendarForecastUtils';

export type SlotConfidenceForecastBannerProps = {
  forecast: SlotConfidenceForecast;
};

export function SlotConfidenceForecastBanner({ forecast }: SlotConfidenceForecastBannerProps) {
  if (forecast.totalCommitted === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="font-heading text-sm font-bold text-text">
          ~{forecast.expectedTurnup} / {forecast.totalCommitted} Expected
        </span>
        <Badge variant="default" className="text-xs font-semibold px-2.5 py-0.5">
          {forecast.confidencePercentage}% Confidence
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Badge
          variant="outline"
          icon={
            <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
          }
          className="border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200 font-semibold"
          title="Historical turnup rate ≥ 80%"
        >
          {forecast.highCount} Solid (≥80%)
        </Badge>

        {forecast.moderateCount > 0 && (
          <Badge
            variant="outline"
            icon={<span className="h-2 w-2 rounded-full bg-amber-600 dark:bg-amber-400 shrink-0" />}
            className="border-amber-500/30 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200 font-semibold"
            title="Historical turnup rate 50% - 79%"
          >
            {forecast.moderateCount} Mod (50-79%)
          </Badge>
        )}

        {forecast.atRiskCount > 0 && (
          <Badge
            variant="outline"
            icon={<span className="h-2 w-2 rounded-full bg-rose-600 dark:bg-rose-400 shrink-0" />}
            className="border-rose-500/30 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200 font-semibold"
            title="Historical turnup rate < 50%"
          >
            {forecast.atRiskCount} At Risk (&lt;50%)
          </Badge>
        )}

        {forecast.excusedCount > 0 && (
          <Badge
            variant="outline"
            className="border-border/80 bg-muted/15 text-text font-semibold"
            title="Excused absences filed for this slot"
          >
            {forecast.excusedCount} Excused
          </Badge>
        )}
      </div>
    </div>
  );
}
