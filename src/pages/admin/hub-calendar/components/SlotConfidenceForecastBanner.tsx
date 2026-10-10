import { Badge } from '@/components/ui';

import type { ConfidenceTier, SlotConfidenceForecast } from '../utils';

export type SlotConfidenceForecastBannerProps = {
  forecast: SlotConfidenceForecast;
  selectedTier?: ConfidenceTier | null;
  onSelectTier?: (tier: ConfidenceTier | null) => void;
};

export function SlotConfidenceForecastBanner({
  forecast,
  selectedTier = null,
  onSelectTier,
}: SlotConfidenceForecastBannerProps) {
  if (forecast.totalCommitted === 0) return null;

  const handleToggleTier = (tier: ConfidenceTier) => {
    if (!onSelectTier) return;
    onSelectTier(selectedTier === tier ? null : tier);
  };

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

      <div className="flex flex-wrap items-center gap-1.5 text-muted">
        <button
          type="button"
          onClick={() => handleToggleTier('solid')}
          disabled={!onSelectTier}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition-colors ${
            selectedTier === 'solid'
              ? 'bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/40 font-semibold'
              : 'hover:bg-surface hover:text-text cursor-pointer'
          } ${!onSelectTier ? 'cursor-default' : ''}`}
          title="Filter by Solid (turnup rate ≥ 70%)"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-text font-semibold">{forecast.highCount}</span> Solid
        </button>

        {forecast.moderateCount > 0 && (
          <button
            type="button"
            onClick={() => handleToggleTier('moderate')}
            disabled={!onSelectTier}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition-colors ${
              selectedTier === 'moderate'
                ? 'bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/40 font-semibold'
                : 'hover:bg-surface hover:text-text cursor-pointer'
            } ${!onSelectTier ? 'cursor-default' : ''}`}
            title="Filter by Moderate (turnup rate 40%–69%)"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-text font-semibold">{forecast.moderateCount}</span> Moderate
          </button>
        )}

        {forecast.atRiskCount > 0 && (
          <button
            type="button"
            onClick={() => handleToggleTier('at_risk')}
            disabled={!onSelectTier}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition-colors ${
              selectedTier === 'at_risk'
                ? 'bg-rose-500/15 text-rose-800 ring-1 ring-rose-500/40 font-semibold'
                : 'hover:bg-surface hover:text-text cursor-pointer'
            } ${!onSelectTier ? 'cursor-default' : ''}`}
            title="Filter by At Risk (low positive turnup rate)"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
            <span className="text-text font-semibold">{forecast.atRiskCount}</span> At Risk
          </button>
        )}

        {forecast.inactiveCount > 0 && (
          <button
            type="button"
            onClick={() => handleToggleTier('inactive')}
            disabled={!onSelectTier}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition-colors ${
              selectedTier === 'inactive'
                ? 'bg-zinc-500/15 text-zinc-800 ring-1 ring-zinc-500/40 font-semibold'
                : 'hover:bg-surface hover:text-text cursor-pointer'
            } ${!onSelectTier ? 'cursor-default' : ''}`}
            title="Filter by Inactive (0% turnout / no attendance data)"
          >
            <span className="h-2 w-2 rounded-full bg-zinc-500 shrink-0" />
            <span className="text-text font-semibold">{forecast.inactiveCount}</span> Inactive
          </button>
        )}

        {forecast.excusedCount > 0 && (
          <button
            type="button"
            onClick={() => handleToggleTier('excused')}
            disabled={!onSelectTier}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition-colors ${
              selectedTier === 'excused'
                ? 'bg-primary/15 text-primary ring-1 ring-primary/40 font-semibold'
                : 'hover:bg-surface hover:text-text cursor-pointer'
            } ${!onSelectTier ? 'cursor-default' : ''}`}
            title="Filter by Excused absences"
          >
            <span className="h-2 w-2 rounded-full bg-muted shrink-0" />
            <span className="text-text font-semibold">{forecast.excusedCount}</span> Excused
          </button>
        )}
      </div>
    </div>
  );
}
