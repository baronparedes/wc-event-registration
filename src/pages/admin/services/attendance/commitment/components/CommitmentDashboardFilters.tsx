import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';

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
      <Tabs value={timeframe} onValueChange={(val) => onTimeframeChange(val as DashboardTimeframe)}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
        {timeframe === 'YTD'
          ? 'YTD includes Q1, Q2, Q3, and Q4 aggregate attendance metrics.'
          : `${timeframe} includes data for the selected quarter in ${year}.`}
      </div>
    </div>
  );
}
