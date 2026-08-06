import { Avatar, Button } from '@/components/ui';

import type { WeekCell } from '../';

type MobileMilestonesCalendarProps = {
  viewYear: number;
  viewMonthIndex: number;
  selectedDayNumber: number;
  mobileWeekCells: WeekCell[];
  currentWeekNumber: number;
  weekOptions: Array<{ weekNumber: number; isAvailable: boolean }>;
  onSelectWeek: (weekNumber: number) => void;
  onSelectDay: (dayNumber: number) => void;
};

export function MobileMilestonesCalendar({
  viewYear,
  viewMonthIndex,
  selectedDayNumber,
  mobileWeekCells,
  currentWeekNumber,
  weekOptions,
  onSelectWeek,
  onSelectDay,
}: MobileMilestonesCalendarProps) {
  return (
    <div>
      <div className="mb-3 rounded-2xl border border-border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-5 gap-1.5">
          {weekOptions.map((week) => {
            const isSelected = week.weekNumber === currentWeekNumber;

            return (
              <Button
                key={week.weekNumber}
                type="button"
                variant="outline"
                onClick={() => onSelectWeek(week.weekNumber)}
                disabled={!week.isAvailable}
                aria-label={`Go to week ${week.weekNumber}`}
                className={`h-10 px-0 text-xs font-semibold ${
                  isSelected ? 'border-primary bg-primary/10 text-primary' : ''
                }`}
              >
                W{week.weekNumber}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        {mobileWeekCells.map((cell) => {
          const isSelected =
            cell.date.getFullYear() === viewYear &&
            cell.date.getMonth() === viewMonthIndex &&
            cell.date.getDate() === selectedDayNumber;

          return (
            <button
              key={cell.monthDayKey}
              type="button"
              onClick={() => onSelectDay(cell.date.getDate())}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-background hover:border-primary/40 hover:bg-primary/[0.03]'
              }`}
            >
              <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-border bg-surface px-2 py-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {cell.date.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span className="mt-1 text-lg font-semibold text-text">{cell.date.getDate()}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-text">
                    {cell.date.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  {cell.entries.length > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {cell.entries.length}
                    </span>
                  )}
                </div>

                {cell.entries.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cell.entries.slice(0, 3).map((entry) => (
                      <Avatar
                        key={entry.id}
                        size="sm"
                        name={entry.member.full_name}
                        avatarObjectKey={entry.member.avatar_object_key}
                        className="h-8 w-8 border-2 border-background shadow-sm"
                      />
                    ))}
                    {cell.entries.length > 3 && (
                      <span className="inline-flex h-8 items-center rounded-full border border-border bg-surface px-2 text-xs font-medium text-muted">
                        +{cell.entries.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted">No birthdays</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
