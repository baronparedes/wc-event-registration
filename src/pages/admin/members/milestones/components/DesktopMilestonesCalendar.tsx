import { Avatar } from '@/components/ui';

import type { CalendarCell, MilestoneEntry } from '../';

type DesktopMilestonesCalendarProps = {
  calendarCells: CalendarCell[];
  milestoneMap: Map<string, MilestoneEntry[]>;
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
};

export function DesktopMilestonesCalendar({
  calendarCells,
  milestoneMap,
  selectedDayNumber,
  onSelectDay,
}: DesktopMilestonesCalendarProps) {
  return (
    <div className="min-w-0">
      <div className="min-w-0 pb-1">
        <div className="w-full min-w-0 space-y-4">
          <div className="grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayLabel) => (
              <div key={dayLabel} className="px-2 py-1 text-center">
                {dayLabel}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell, index) => {
              if (!cell.isCurrentMonth || !cell.dayNumber || !cell.monthDayKey) {
                return (
                  <div
                    key={`blank-${index}`}
                    className="min-h-24 rounded-2xl border border-dashed border-border/60 bg-muted/30 sm:min-h-28"
                  />
                );
              }

              const entriesForDay = milestoneMap.get(cell.monthDayKey) ?? [];
              const hasMilestones = entriesForDay.length > 0;
              const isSelected = cell.dayNumber === selectedDayNumber;

              return (
                <button
                  key={cell.monthDayKey}
                  type="button"
                  onClick={() => onSelectDay(cell.dayNumber ?? 1)}
                  className={`min-h-24 rounded-2xl border p-3 text-left transition sm:min-h-28 ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-background hover:border-primary/40 hover:bg-primary/[0.03]'
                  } ${hasMilestones ? 'ring-1 ring-primary/10' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-text">{cell.dayNumber}</span>
                    {hasMilestones && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {entriesForDay.length}
                      </span>
                    )}
                  </div>

                  {hasMilestones ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {entriesForDay.slice(0, 3).map((entry) => (
                        <Avatar
                          key={entry.id}
                          size="sm"
                          name={entry.member.full_name}
                          avatarObjectKey={entry.member.avatar_object_key}
                          className="h-8 w-8 border-2 border-background shadow-sm"
                        />
                      ))}
                      {entriesForDay.length > 3 && (
                        <span className="inline-flex h-8 items-center rounded-full border border-border bg-surface px-2 text-xs font-medium text-muted">
                          +{entriesForDay.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-muted">No milestones</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
