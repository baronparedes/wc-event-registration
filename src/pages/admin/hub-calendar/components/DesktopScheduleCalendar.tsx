import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { CalendarCell, MilestoneEntry } from '@/lib/domain/hub-calendar';

import { ExcusedAvatar, MilestoneAvatar, MilestoneBadge } from './';

type DesktopScheduleCalendarProps = {
  calendarCells: CalendarCell[];
  scheduleMap: Map<string, MemberScheduleEntry[]>;
  milestoneMap: Map<string, MilestoneEntry[]>;
  excusedMap?: Map<string, Set<string>>;
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
};

export function DesktopScheduleCalendar({
  calendarCells,
  scheduleMap,
  milestoneMap,
  excusedMap,
  selectedDayNumber,
  onSelectDay,
}: DesktopScheduleCalendarProps) {
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
                    className="min-h-36 rounded-2xl border border-dashed border-border/60 bg-muted/30"
                  />
                );
              }

              const entriesForDay = scheduleMap.get(cell.monthDayKey) ?? [];
              const milestonesForDay = milestoneMap.get(cell.monthDayKey) ?? [];
              const hasSchedules = cell.isSunday && entriesForDay.length > 0;
              const hasMilestones = milestonesForDay.length > 0;
              const isSelected = cell.dayNumber === selectedDayNumber;

              const birthdays = milestonesForDay.filter((m) => m.type === 'birthday');
              const anniversaries = milestonesForDay.filter(
                (m) => m.type === 'wedding_anniversary',
              );

              const scheduleList = hasSchedules ? entriesForDay : [];
              const totalItems = milestonesForDay.length + scheduleList.length;
              const hasExcess = totalItems > 6;
              const maxVisible = hasExcess ? 5 : 6;
              const visibleMilestones = milestonesForDay.slice(0, maxVisible);
              const remainingSlots = Math.max(0, maxVisible - visibleMilestones.length);
              const visibleSchedules = scheduleList.slice(0, remainingSlots);
              const excessCount = totalItems - (visibleMilestones.length + visibleSchedules.length);

              return (
                <button
                  key={cell.monthDayKey}
                  type="button"
                  onClick={() => onSelectDay(cell.dayNumber ?? 1)}
                  className={`flex min-h-36 flex-col rounded-2xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                      : 'border-border bg-background hover:border-primary/40 hover:bg-primary/[0.03]'
                  } ${hasSchedules ? 'ring-1 ring-primary/10' : ''}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span
                      className={`text-sm leading-none ${
                        isSelected ? 'font-bold text-primary' : 'font-semibold text-text'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {hasSchedules && (
                        <span
                          className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                          title={`${entriesForDay.length} scheduled`}
                        >
                          {entriesForDay.length} sched
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

                  <div className="mt-2.5 flex flex-1 flex-col justify-start gap-1.5">
                    {/* Combined milestones and Sunday schedules preview */}
                    {totalItems > 0 && (
                      <div className="flex flex-wrap gap-1">
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
                            isExcused={
                              excusedMap?.get(cell.monthDayKey!)?.has(entry.member.id) ?? false
                            }
                          />
                        ))}
                        {excessCount > 0 && (
                          <span
                            className="inline-flex h-8 items-center rounded-full border border-border bg-surface px-1.5 text-[11px] font-medium text-muted"
                            title={`${excessCount} more`}
                          >
                            +{excessCount}
                          </span>
                        )}
                      </div>
                    )}

                    {!hasSchedules && !hasMilestones && cell.isSunday && (
                      <p className="mt-2 text-[11px] text-muted">No schedules</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
