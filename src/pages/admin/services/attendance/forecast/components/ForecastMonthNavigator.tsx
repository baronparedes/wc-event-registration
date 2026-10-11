import { format } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui';

export type ForecastMonthNavigatorProps = {
  viewDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  isCurrentMonth: boolean;
  evaluationWindow?: { startDate: string; endDate: string };
};

export function ForecastMonthNavigator({
  viewDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
  isCurrentMonth,
  evaluationWindow,
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
          <p className="text-xs text-muted">
            {evaluationWindow
              ? `Turnup baseline: ${evaluationWindow.startDate} to ${evaluationWindow.endDate} (3 months prior)`
              : 'Viewing Sunday forecast projections for this month'}
          </p>
        </div>
      </div>

      <div className="flex w-full items-center gap-1.5 sm:w-auto sm:gap-2">
        <Button
          type="button"
          onClick={onPreviousMonth}
          aria-label="Previous Month"
          title="Previous Month"
          className="shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onToday}
          disabled={isCurrentMonth}
          className="flex-1 sm:flex-initial"
        >
          This Month
        </Button>

        <Button
          type="button"
          onClick={onNextMonth}
          aria-label="Next Month"
          title="Next Month"
          className="shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
