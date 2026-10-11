import { format } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui';

export type ForecastMonthNavigatorProps = {
  viewDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  isCurrentMonth: boolean;
};

export function ForecastMonthNavigator({
  viewDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
  isCurrentMonth,
}: ForecastMonthNavigatorProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 sm:p-4 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Calendar className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-text">
            {format(viewDate, 'MMMM yyyy')}
          </h2>
          <p className="text-xs text-muted">Viewing Sunday forecast projections for this month</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onPreviousMonth}
          aria-label="Previous Month"
          title="Previous Month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {!isCurrentMonth && (
          <Button type="button" variant="secondary" size="sm" onClick={onToday} className="text-xs">
            This Month
          </Button>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onNextMonth}
          aria-label="Next Month"
          title="Next Month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
