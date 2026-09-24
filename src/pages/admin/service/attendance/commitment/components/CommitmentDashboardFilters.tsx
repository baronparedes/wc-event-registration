export type DashboardTimeframe = 'YTD' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface CommitmentDashboardFiltersProps {
  timeframe: DashboardTimeframe;
  onTimeframeChange: (timeframe: DashboardTimeframe) => void;
  year: number;
}

export function CommitmentDashboardFilters({
  timeframe,
  onTimeframeChange,
  year,
}: CommitmentDashboardFiltersProps) {
  const tabs: { value: DashboardTimeframe; label: string }[] = [
    { value: 'YTD', label: 'YTD · Year to Date' },
    { value: 'Q1', label: 'Q1 · Jan – Mar' },
    { value: 'Q2', label: 'Q2 · Apr – Jun' },
    { value: 'Q3', label: 'Q3 · Jul – Sep' },
    { value: 'Q4', label: 'Q4 · Oct – Dec' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTimeframeChange(tab.value)}
            className={`px-4 py-3 text-sm font-semibold transition-colors ${
              timeframe === tab.value
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
        {timeframe === 'YTD'
          ? 'YTD includes Q1, Q2, Q3, Q4.'
          : `${timeframe} includes data for the selected quarter in ${year}.`}
      </div>
    </div>
  );
}
