import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';

import { Button, FormSelectField } from '@/components/ui';

interface ServiceAttendanceHeaderControlsProps {
  viewYear: number;
  viewMonthIndex: number;
  monthOnlyName: string;
  isAtToday: boolean;
  years: number[];
  onToday: () => void;
  onSelectYear: (year: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onViewExcuses?: () => void;
  excuseCount?: number;
}

export function ServiceAttendanceHeaderControls({
  viewYear,
  viewMonthIndex,
  monthOnlyName,
  isAtToday,
  years,
  onToday,
  onSelectYear,
  onPreviousMonth,
  onNextMonth,
  onViewExcuses,
  excuseCount,
}: ServiceAttendanceHeaderControlsProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {onViewExcuses && (
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onViewExcuses}
          className="h-10 font-semibold shadow-xs order-last sm:order-first gap-1.5"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          Filed Excuses {excuseCount !== undefined && excuseCount > 0 ? `(${excuseCount})` : ''}
        </Button>
      )}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onToday}
          disabled={isAtToday}
          className="h-10 flex-1 font-semibold shadow-xs sm:flex-initial"
        >
          Today
        </Button>

        <div className="flex-1 sm:flex-initial sm:w-28">
          <FormSelectField
            ariaLabel="Select year"
            value={String(viewYear)}
            onChange={onSelectYear}
            placeholder=""
            options={years.map((y) => ({
              value: String(y),
              label: String(y),
            }))}
            selectClassName="h-10 py-2 border-border bg-surface font-semibold text-text shadow-xs"
          />
        </div>
      </div>

      <div className="flex w-full items-center justify-between rounded-lg border border-border bg-surface sm:w-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onPreviousMonth}
          aria-label="Previous month"
          disabled={viewMonthIndex === 0}
          className="h-10 w-10 shrink-0 px-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="min-w-[110px] flex-1 px-3 text-center text-base font-semibold text-text sm:flex-initial">
          {monthOnlyName}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onNextMonth}
          aria-label="Next month"
          disabled={viewMonthIndex === 11}
          className="h-10 w-10 shrink-0 px-0"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
