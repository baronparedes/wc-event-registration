import { useMemo, useState } from 'react';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Avatar, Button, EmptyState, SectionCard } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import {
  type MemberScheduleEntry,
  type SundayKey,
  type TimeSlot,
  useAdminMembersSchedulesQuery,
} from '@/hooks/domain/members';
import { useIsMobileViewport } from '@/hooks/utils';

import { DesktopScheduleCalendar } from './components/DesktopScheduleCalendar';
import { MobileScheduleCalendar } from './components/MobileScheduleCalendar';

export type CalendarCell = {
  dayNumber: number | null;
  monthDayKey: string | null;
  isCurrentMonth: boolean;
  isSunday: boolean;
  sundayKey: SundayKey | null;
};

export type WeekCell = {
  date: Date;
  monthDayKey: string;
  entries: MemberScheduleEntry[];
  isSunday: boolean;
  sundayKey: SundayKey | null;
};

const SUNDAY_KEYS: SundayKey[] = [
  'first_sunday',
  'second_sunday',
  'third_sunday',
  'fourth_sunday',
  'fifth_sunday',
];

function toMonthDayKey(month: number, day: number): string {
  return `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function getWeekStartDayFromWeekNumber(weekNumber: number): number {
  return (weekNumber - 1) * 7 + 1;
}

function getWeekWindowStartDay(dayNumber: number): number {
  return Math.floor((dayNumber - 1) / 7) * 7 + 1;
}

function getLastWeekWindowStartDay(daysInMonth: number): number {
  return getWeekWindowStartDay(daysInMonth);
}

function formatSelectedDate(year: number, monthIndex: number, day: number): string {
  const date = new Date(year, monthIndex, day);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function buildCalendarCells(year: number, monthIndex: number): CalendarCell[] {
  const cells: CalendarCell[] = [];
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  // Padding start
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({
      dayNumber: null,
      monthDayKey: null,
      isCurrentMonth: false,
      isSunday: false,
      sundayKey: null,
    });
  }

  // Current month
  let sundayCount = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    const isSunday = (startDayOfWeek + i - 1) % 7 === 0;
    let sundayKey: SundayKey | null = null;
    if (isSunday) {
      sundayKey = SUNDAY_KEYS[sundayCount];
      sundayCount++;
    }

    cells.push({
      dayNumber: i,
      monthDayKey: toMonthDayKey(monthIndex + 1, i),
      isCurrentMonth: true,
      isSunday,
      sundayKey,
    });
  }

  // Padding end
  const remainingCells = 42 - cells.length;
  for (let i = 0; i < remainingCells; i++) {
    cells.push({
      dayNumber: null,
      monthDayKey: null,
      isCurrentMonth: false,
      isSunday: false,
      sundayKey: null,
    });
  }

  return cells;
}

function buildMobileWeekCells(
  year: number,
  monthIndex: number,
  weekStartDay: number,
  daysInMonth: number,
  scheduleMap: Map<string, MemberScheduleEntry[]>,
): WeekCell[] {
  const cells: WeekCell[] = [];
  const firstDay = new Date(year, monthIndex, 1);
  const startDayOfWeek = firstDay.getDay();

  let sundayCount = Math.floor((weekStartDay - 1 + startDayOfWeek) / 7);

  for (let i = 0; i < 7; i++) {
    const currentDay = weekStartDay + i;
    if (currentDay > daysInMonth) break;

    const isSunday = (startDayOfWeek + currentDay - 1) % 7 === 0;
    let sundayKey: SundayKey | null = null;
    if (isSunday) {
      sundayKey = SUNDAY_KEYS[sundayCount];
      sundayCount++;
    }

    const monthDayKey = toMonthDayKey(monthIndex + 1, currentDay);
    const entries = scheduleMap.get(monthDayKey) ?? [];
    cells.push({
      date: new Date(year, monthIndex, currentDay),
      monthDayKey,
      entries,
      isSunday,
      sundayKey,
    });
  }

  return cells;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const isMobileViewport = useIsMobileViewport();

  const { data: scheduleEntries = [], isLoading, error } = useAdminMembersSchedulesQuery();

  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = new Date();
  const viewYear = viewDate.getFullYear();
  const viewMonthIndex = viewDate.getMonth();

  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(today.getDate());
  const [mobileWeekStartDay, setMobileWeekStartDay] = useState<number>(() =>
    getWeekWindowStartDay(today.getDate()),
  );

  const minViewDate = new Date(today.getFullYear() - 1, today.getMonth(), 1);
  const maxViewDate = new Date(today.getFullYear() + 2, today.getMonth(), 1);

  const calendarCells = useMemo(
    () => buildCalendarCells(viewYear, viewMonthIndex),
    [viewYear, viewMonthIndex],
  );
  const daysInMonth = new Date(viewYear, viewMonthIndex + 1, 0).getDate();

  // Create a map of monthDayKey -> MemberScheduleEntry[] for the current month view
  // Only map entries to Sundays
  const scheduleMap = useMemo(() => {
    const map = new Map<string, MemberScheduleEntry[]>();
    for (const cell of calendarCells) {
      if (cell.isCurrentMonth && cell.isSunday && cell.sundayKey) {
        const matchingEntries = scheduleEntries.filter(
          (entry) => entry.sundayKey === cell.sundayKey,
        );
        map.set(cell.monthDayKey!, matchingEntries);
      }
    }
    return map;
  }, [scheduleEntries, calendarCells]);

  const selectedMonthDayKey = toMonthDayKey(
    viewMonthIndex + 1,
    Math.min(selectedDayNumber, daysInMonth),
  );
  const selectedEntries = scheduleMap.get(selectedMonthDayKey) ?? [];

  // Group selected entries by timeslot
  const entriesByTimeSlot = useMemo(() => {
    const grouped: Record<TimeSlot, MemberScheduleEntry[]> = {
      '9AM': [],
      '12NN': [],
      '3PM': [],
    };
    for (const entry of selectedEntries) {
      for (const slot of entry.timeSlots) {
        grouped[slot].push(entry);
      }
    }
    return grouped;
  }, [selectedEntries]);

  const isAtMinimumMonth = viewYear === minViewDate.getFullYear() && viewMonthIndex === 0;
  const isAtMaximumMonth =
    viewYear === maxViewDate.getFullYear() && viewMonthIndex === maxViewDate.getMonth();
  const isAtToday =
    viewYear === today.getFullYear() &&
    viewMonthIndex === today.getMonth() &&
    selectedDayNumber === today.getDate();
  const lastWeekWindowStartDay = getLastWeekWindowStartDay(daysInMonth);
  const currentWeekNumber = Math.ceil(mobileWeekStartDay / 7);
  const weekOptions = Array.from({ length: 5 }, (_, index) => {
    const weekNumber = index + 1;
    const weekStartDay = getWeekStartDayFromWeekNumber(weekNumber);

    return {
      weekNumber,
      isAvailable: weekStartDay <= lastWeekWindowStartDay,
    };
  });
  const mobileWeekCells = buildMobileWeekCells(
    viewYear,
    viewMonthIndex,
    mobileWeekStartDay,
    daysInMonth,
    scheduleMap,
  );

  function handlePreviousMonth() {
    if (isAtMinimumMonth) return;
    setViewDate(new Date(viewYear, viewMonthIndex - 1, 1));
    setSelectedDayNumber(1);
    setMobileWeekStartDay(1);
  }

  function handleNextMonth() {
    if (isAtMaximumMonth) return;
    setViewDate(new Date(viewYear, viewMonthIndex + 1, 1));
    setSelectedDayNumber(1);
    setMobileWeekStartDay(1);
  }

  function handleSelectWeek(weekNumber: number) {
    const weekStartDay = getWeekStartDayFromWeekNumber(weekNumber);
    if (weekStartDay > lastWeekWindowStartDay) return;

    setMobileWeekStartDay(weekStartDay);
    setSelectedDayNumber(weekStartDay);
  }

  function handleToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDayNumber(today.getDate());
    setMobileWeekStartDay(getWeekWindowStartDay(today.getDate()));
  }

  function renderSelectedTimeSlot(slot: TimeSlot, label: string) {
    const entries = entriesByTimeSlot[slot];
    if (entries.length === 0) return null;

    return (
      <div key={slot} className="mb-6 last:mb-0">
        <h3 className="mb-3 font-heading text-lg font-semibold text-text">{label}</h3>
        <div className="space-y-1">
          {entries.map((entry) => (
            <button
              type="button"
              key={entry.member.id}
              onClick={() =>
                navigate(ROUTE_PATHS.adminMemberDetailPattern.replace(':id', entry.member.id))
              }
              className="flex w-full items-center gap-3 p-3 border-b border-border last:border-b-0 hover:bg-primary/5 transition text-left"
            >
              <Avatar
                size="lg"
                name={entry.member.full_name}
                avatarObjectKey={entry.member.avatar_object_key}
                className="h-11 w-11 border-2 border-surface shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-text">{entry.member.full_name}</p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {entry.member.member_id} • {entry.member.nickname || 'No nickname'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (error) {
      return (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-red-600">Failed to load member schedules. Please refresh.</p>
        </div>
      );
    }

    return (
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SectionCard>
            <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-heading text-xl font-semibold text-text">Service Schedules</h2>
                <p className="mt-2 text-sm text-muted">
                  Select a Sunday to view member service commitments.
                </p>
              </div>

              <div className="w-full min-w-0 sm:w-[22rem]">
                <Button
                  type="button"
                  onClick={handleToday}
                  disabled={isAtToday}
                  className="h-12 w-full rounded-lg px-3 text-sm font-semibold mb-2"
                >
                  Today
                </Button>
                <div className="grid w-full grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2">
                  <Button
                    type="button"
                    variant="primaryOutline"
                    onClick={handlePreviousMonth}
                    aria-label="Previous month"
                    disabled={isAtMinimumMonth}
                    className="h-12 w-12 px-0"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <label className="min-w-0 truncate rounded-lg border border-border bg-surface px-4 py-2 text-center text-base font-medium text-text sm:text-lg">
                    {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </label>
                  <Button
                    type="button"
                    variant="primaryOutline"
                    onClick={handleNextMonth}
                    aria-label="Next month"
                    disabled={isAtMaximumMonth}
                    className="h-12 w-12 px-0"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 min-w-0">
              {isMobileViewport ? (
                <MobileScheduleCalendar
                  viewYear={viewYear}
                  viewMonthIndex={viewMonthIndex}
                  selectedDayNumber={selectedDayNumber}
                  mobileWeekCells={mobileWeekCells}
                  currentWeekNumber={currentWeekNumber}
                  weekOptions={weekOptions}
                  onSelectWeek={handleSelectWeek}
                  onSelectDay={setSelectedDayNumber}
                />
              ) : (
                <DesktopScheduleCalendar
                  calendarCells={calendarCells}
                  scheduleMap={scheduleMap}
                  selectedDayNumber={selectedDayNumber}
                  onSelectDay={setSelectedDayNumber}
                />
              )}
            </div>
          </SectionCard>
        </div>
        <div className="xl:col-span-4">
          <SectionCard
            title="Selected Sunday"
            subtitle={formatSelectedDate(viewYear, viewMonthIndex, selectedDayNumber)}
          >
            {selectedEntries.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-6 w-6" />}
                title="No schedules on this date"
                description={
                  calendarCells.find((c) => c.dayNumber === selectedDayNumber)?.isSunday
                    ? 'No members are scheduled for this Sunday.'
                    : 'Select a Sunday to view member schedules.'
                }
                className="px-4 py-10"
              />
            ) : (
              <div>
                {renderSelectedTimeSlot('9AM', '9:00 AM Service')}
                {renderSelectedTimeSlot('12NN', '12:00 NN Service')}
                {renderSelectedTimeSlot('3PM', '3:00 PM Service')}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    );
  };

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Admin Dashboard"
        description="Overview of upcoming committed schedules and activities."
      />
      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading schedules...">
        {renderContent()}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
