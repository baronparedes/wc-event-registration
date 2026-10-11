import { format } from 'date-fns';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui';

import type { SundayForecastData } from '../hooks/useAttendanceForecastData';

export type ForecastSundaySelectorProps = {
  sundays: SundayForecastData[];
  activeSundayKey: string;
  onChangeSunday: (sundayKey: string) => void;
};

export function ForecastSundaySelector({
  sundays,
  activeSundayKey,
  onChangeSunday,
}: ForecastSundaySelectorProps) {
  return (
    <Tabs value={activeSundayKey} onValueChange={onChangeSunday} className="w-full">
      <TabsList containerClassName="justify-start">
        <TabsTrigger value="ALL">All Sundays</TabsTrigger>
        {sundays.map((sunday) => {
          const formattedLabel = `${sunday.ordinalLabel} (${format(sunday.date, 'MMM d')})`;
          return (
            <TabsTrigger key={sunday.isoDateKey} value={sunday.isoDateKey}>
              {formattedLabel}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
