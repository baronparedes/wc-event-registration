import { Button } from '@/components/ui';
import type { WeekCell } from '@/lib/domain/hub-calendar';

import { ExcusedAvatar, MilestoneAvatar, MilestoneBadge } from './';

type MobileScheduleCalendarProps = {
  viewYear: number;
  viewMonthIndex: number;
  selectedDayNumber: number;
  mobileWeekCells: WeekCell[];
  currentWeekNumber: number;
  weekOptions: Array<{ weekNumber: number; isAvailable: boolean }>;
  excusedMap?: Map<string, Set<string>>;
  onSelectWeek: (weekNumber: number) => void;
  onSelectDay: (dayNumber: number, date?: Date) => void;
};

export function MobileScheduleCalendar({
  viewYear,
  viewMonthIndex,
  selectedDayNumber,
  mobileWeekCells,
  currentWeekNumber,
  weekOptions,
  onSelectWeek,
  onSelectDay,
}: MobileScheduleCalendarProps) {
  return (
    <div>
      <div className="mb-3 rounded-2xl border border-border bg-background p-2 shadow-sm">
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${weekOptions.length}, minmax(0, 1fr))` }}
        >
          {weekOptions.map((week) => {
            const isSelected = week.weekNumber === currentWeekNumber;

            return (
              <Button
                key={week.weekNumber}
                type="button"
                variant="primaryOutline"
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
          const isCurrentMonth =
            cell.date.getFullYear() === viewYear && cell.date.getMonth() === viewMonthIndex;

          const isSelected = isCurrentMonth && cell.date.getDate() === selectedDayNumber;

          const hasSchedules = cell.isSunday && cell.scheduleEntries.length > 0;
          const hasMilestones = cell.milestoneEntries.length > 0;
          const birthdays = cell.milestoneEntries.filter((m) => m.type === 'birthday');
          const anniversaries = cell.milestoneEntries.filter(
            (m) => m.type === 'wedding_anniversary',
          );

          const scheduleList = hasSchedules ? cell.scheduleEntries : [];
          const totalItems = cell.milestoneEntries.length + scheduleList.length;
          const hasExcess = totalItems > 6;
          const maxVisible = hasExcess ? 5 : 6;
          const visibleMilestones = cell.milestoneEntries.slice(0, maxVisible);
          const remainingSlots = Math.max(0, maxVisible - visibleMilestones.length);
          const visibleSchedules = scheduleList.slice(0, remainingSlots);
          const excessCount = totalItems - (visibleMilestones.length + visibleSchedules.length);

          return (
            <button
              key={`${cell.monthDayKey}-${cell.date.getFullYear()}-${cell.date.getMonth()}`}
              type="button"
              onClick={() => onSelectDay(cell.date.getDate(), cell.date)}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                  : isCurrentMonth
                    ? 'border-border bg-background hover:border-primary/40 hover:bg-primary/[0.03]'
                    : 'border-dashed border-border/70 bg-surface/40 opacity-60 hover:opacity-100 hover:border-primary/40'
              }`}
            >
              <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-border bg-surface px-2 py-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {cell.date.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span
                  className={`mt-1 text-lg leading-none ${
                    isSelected ? 'font-bold text-primary' : 'font-semibold text-text'
                  }`}
                >
                  {cell.date.getDate()}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-text">
                    {cell.date.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>

                  <div className="flex items-center gap-1">
                    {hasSchedules && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {cell.scheduleEntries.length} sched
                      </span>
                    )}
                    {birthdays.length > 0 && (
                      <MilestoneBadge
                        type="birthday"
                        size="sm"
                        title={`${birthdays.length} birthday(s)`}
                      >
                        {birthdays.length}
                      </MilestoneBadge>
                    )}
                    {anniversaries.length > 0 && (
                      <MilestoneBadge
                        type="wedding_anniversary"
                        size="sm"
                        title={`${anniversaries.length} wedding anniversary(ies)`}
                      >
                        {anniversaries.length}
                      </MilestoneBadge>
                    )}
                  </div>
                </div>

                {/* Combined milestones and Sunday schedules preview */}
                {totalItems > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {visibleMilestones.map((m) => (
                      <MilestoneAvatar
                        key={m.id}
                        size="sm"
                        name={m.member.full_name}
                        avatarObjectKey={m.member.avatar_object_key}
                        type={m.type}
                      />
                    ))}
                    {visibleSchedules.map((entry) => (
                      <ExcusedAvatar
                        key={entry.member.id}
                        size="sm"
                        name={entry.member.full_name}
                        avatarObjectKey={entry.member.avatar_object_key}
                      />
                    ))}
                    {excessCount > 0 && (
                      <span
                        className="inline-flex h-8 items-center rounded-full border border-border bg-surface px-2 text-xs font-medium text-muted"
                        title={`${excessCount} more`}
                      >
                        +{excessCount}
                      </span>
                    )}
                  </div>
                )}

                {!hasSchedules && !hasMilestones && (
                  <p className="mt-1 text-xs text-muted">
                    {cell.isSunday ? 'No schedules' : 'No milestones'}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
