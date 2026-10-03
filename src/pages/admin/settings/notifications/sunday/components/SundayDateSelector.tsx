import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

import { Badge, Button } from '@/components/ui';
import { formatDateOnly } from '@/lib/infrastructure/dateFormat';

interface SundayDateSelectorProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  onResetToNearest: () => void;
  ordinal?: number;
  sundayKey?: string;
  isNearest: boolean;
}

export function SundayDateSelector({
  selectedDate,
  onDateChange,
  onResetToNearest,
  ordinal,
  sundayKey,
  isNearest,
}: SundayDateSelectorProps) {
  const handleOffsetSunday = (deltaDays: number) => {
    if (!selectedDate) return;
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + deltaDays);

    const nextYear = date.getFullYear();
    const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
    const nextDay = String(date.getDate()).padStart(2, '0');
    onDateChange(`${nextYear}-${nextMonth}-${nextDay}`);
  };

  const ordinalSuffix = (n: number) => {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    if (n === 4) return '4th';
    return '5th';
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-surface p-3.5 sm:p-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-5 w-5 shrink-0 text-primary" />
            <h3 className="font-heading text-base font-semibold text-text whitespace-nowrap">
              Target Sunday
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {ordinal && (
              <Badge variant="primaryOutline" className="text-xs">
                {ordinalSuffix(ordinal)} Sunday ({sundayKey})
              </Badge>
            )}
            {isNearest && (
              <Badge variant="accent" className="text-xs">
                Nearest Upcoming
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted">
          {selectedDate ? formatDateOnly(selectedDate) : 'Select a Sunday to inspect and dispatch'}
        </p>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:flex-initial sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOffsetSunday(-7)}
            aria-label="Previous Sunday"
            className="shrink-0 px-2.5"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium text-text shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-40 sm:flex-initial"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOffsetSunday(7)}
            aria-label="Next Sunday"
            className="shrink-0 px-2.5"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!isNearest && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetToNearest}
            className="text-xs gap-1 text-primary shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
