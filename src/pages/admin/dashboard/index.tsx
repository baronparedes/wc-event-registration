import { useMemo, useState } from 'react';

import { Cake, CalendarDays, ChevronLeft, ChevronRight, HeartIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Avatar, Badge, Button, EmptyState, SectionCard } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import {
  type MemberScheduleEntry,
  type SundayKey,
  type TimeSlot,
  useAdminMembersMilestonesQuery,
  useAdminMembersSchedulesQuery,
} from '@/hooks/domain/members';
import { useIsMobileViewport } from '@/hooks/utils';
import { type AdminMember, MEMBER_EXTRA_METADATA_KEYS } from '@/lib/domain/members';
import {
  MilestoneAvatar,
  MilestoneBadge,
  type MilestoneEntry,
  type MilestoneType,
} from '@/pages/admin/members/milestones';
import { ExportMonthMilestonesButton } from '@/pages/admin/members/milestones/components/ExportMonthMilestonesButton';

import { DesktopScheduleCalendar } from './components/DesktopScheduleCalendar';
import { MobileScheduleCalendar } from './components/MobileScheduleCalendar';
import { type WeekRange, getMonthWeekRanges } from './utils/calendarUtils';

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
  scheduleEntries: MemberScheduleEntry[];
  milestoneEntries: MilestoneEntry[];
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

const MILESTONE_DEFINITIONS = [
  {
    type: 'birthday' as const,
    label: 'Birthday',
    icon: Cake,
    sourceDate: (member: AdminMember) => member.date_of_birth,
    badgeClassName: 'border border-primary/20 bg-primary/10 text-primary',
  },
  {
    type: 'wedding_anniversary' as const,
    label: 'Wedding Anniversary',
    icon: HeartIcon,
    sourceDate: (member: AdminMember) =>
      member.extra_metadata[MEMBER_EXTRA_METADATA_KEYS.weddingAnniversaryDate] ?? null,
    badgeClassName: 'border border-red-200 bg-red-50 !text-red-800',
  },
];

function toMonthDayKey(month: number, day: number): string {
  return `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function parseMonthDay(value: string | null): { month: number; day: number } | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
}

function buildMilestoneEntries(members: AdminMember[]): MilestoneEntry[] {
  return members.flatMap((member) =>
    MILESTONE_DEFINITIONS.flatMap((definition) => {
      const parsed = parseMonthDay(definition.sourceDate(member));
      if (!parsed) return [];
      return [
        {
          id: `${member.id}-${definition.type}`,
          type: definition.type,
          member,
        },
      ];
    }),
  );
}

function getMonthDayKeyFromMember(member: AdminMember, type: MilestoneType): string | null {
  const definition = MILESTONE_DEFINITIONS.find((d) => d.type === type);
  const sourceDate = definition ? definition.sourceDate(member) : null;
  const parsed = parseMonthDay(sourceDate);
  return parsed ? toMonthDayKey(parsed.month, parsed.day) : null;
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
  weekRange: WeekRange,
  viewYear: number,
  viewMonthIndex: number,
  scheduleMap: Map<string, MemberScheduleEntry[]>,
  milestoneMap: Map<string, MilestoneEntry[]>,
): WeekCell[] {
  return weekRange.days.map((date) => {
    const isSunday = date.getDay() === 0;
    const isCurrentMonth = date.getFullYear() === viewYear && date.getMonth() === viewMonthIndex;
    const monthDayKey = toMonthDayKey(date.getMonth() + 1, date.getDate());

    let sundayKey: SundayKey | null = null;
    if (isSunday && isCurrentMonth) {
      const sundayIndex = Math.floor((date.getDate() - 1) / 7);
      sundayKey = SUNDAY_KEYS[sundayIndex] ?? null;
    }

    const scheduleEntries = isCurrentMonth ? (scheduleMap.get(monthDayKey) ?? []) : [];
    const milestoneEntries = milestoneMap.get(monthDayKey) ?? [];

    return {
      date,
      monthDayKey,
      scheduleEntries,
      milestoneEntries,
      isSunday,
      sundayKey,
    };
  });
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const isMobileViewport = useIsMobileViewport();

  const schedulesQuery = useAdminMembersSchedulesQuery();
  const milestonesQuery = useAdminMembersMilestonesQuery();

  const scheduleEntries = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data]);
  const members = useMemo(() => milestonesQuery.data ?? [], [milestonesQuery.data]);

  const isLoading = schedulesQuery.isLoading || milestonesQuery.isLoading;
  const error = schedulesQuery.error || milestonesQuery.error;

  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = new Date();
  const viewYear = viewDate.getFullYear();
  const viewMonthIndex = viewDate.getMonth();

  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(today.getDate());
  const [activeTab, setActiveTab] = useState<TimeSlot>('9AM');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  function handleTabChange(slot: TimeSlot) {
    setActiveTab(slot);
    setSelectedRole(null);
  }

  const minViewDate = new Date(today.getFullYear() - 1, today.getMonth(), 1);
  const maxViewDate = new Date(today.getFullYear() + 2, today.getMonth(), 1);

  const calendarCells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    return buildCalendarCells(year, month);
  }, [viewDate]);

  const daysInMonth = new Date(viewYear, viewMonthIndex + 1, 0).getDate();

  // Create a map of monthDayKey -> MemberScheduleEntry[] for current month Sundays
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

  // Build milestone entries and map of monthDayKey -> MilestoneEntry[]
  const milestoneEntries = useMemo(() => buildMilestoneEntries(members), [members]);

  const milestoneMap = useMemo(() => {
    const grouped = new Map<string, MilestoneEntry[]>();
    for (const entry of milestoneEntries) {
      const key = getMonthDayKeyFromMember(entry.member, entry.type);
      if (!key) continue;

      const existing = grouped.get(key) ?? [];
      existing.push(entry);
      grouped.set(key, existing);
    }
    return grouped;
  }, [milestoneEntries]);

  // Current month entries for stats bar & export
  const currentMonthMilestoneEntries = useMemo(() => {
    const monthIndex = viewDate.getMonth();
    return milestoneEntries.filter((entry) => {
      const key = getMonthDayKeyFromMember(entry.member, entry.type);
      if (!key) return false;
      const [month] = key.split('-').map(Number);
      return month === monthIndex + 1;
    });
  }, [milestoneEntries, viewDate]);

  const birthdayCount = useMemo(
    () => currentMonthMilestoneEntries.filter((e) => e.type === 'birthday').length,
    [currentMonthMilestoneEntries],
  );

  const anniversaryCount = useMemo(
    () => currentMonthMilestoneEntries.filter((e) => e.type === 'wedding_anniversary').length,
    [currentMonthMilestoneEntries],
  );

  const selectedMonthDayKey = toMonthDayKey(
    viewMonthIndex + 1,
    Math.min(selectedDayNumber, daysInMonth),
  );

  const selectedEntries = useMemo(
    () => scheduleMap.get(selectedMonthDayKey) ?? [],
    [scheduleMap, selectedMonthDayKey],
  );
  const selectedMilestones = useMemo(
    () => milestoneMap.get(selectedMonthDayKey) ?? [],
    [milestoneMap, selectedMonthDayKey],
  );

  const isCurrentSelectedSunday = calendarCells.some(
    (c) => c.dayNumber === selectedDayNumber && c.isSunday,
  );

  // Group selected schedule entries by timeslot
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
  const monthWeeks = useMemo(
    () => getMonthWeekRanges(viewYear, viewMonthIndex),
    [viewYear, viewMonthIndex],
  );

  const currentWeekNumber = useMemo(() => {
    const matchingWeek = monthWeeks.find((w) =>
      w.days.some(
        (d) =>
          d.getFullYear() === viewYear &&
          d.getMonth() === viewMonthIndex &&
          d.getDate() === selectedDayNumber,
      ),
    );
    return matchingWeek ? matchingWeek.weekNumber : 1;
  }, [monthWeeks, viewYear, viewMonthIndex, selectedDayNumber]);

  const weekOptions = useMemo(() => {
    return monthWeeks.map((week) => ({
      weekNumber: week.weekNumber,
      isAvailable: true,
    }));
  }, [monthWeeks]);

  const activeWeek = monthWeeks.find((w) => w.weekNumber === currentWeekNumber) ?? monthWeeks[0];

  const mobileWeekCells = useMemo(() => {
    if (!activeWeek) return [];
    return buildMobileWeekCells(activeWeek, viewYear, viewMonthIndex, scheduleMap, milestoneMap);
  }, [activeWeek, viewYear, viewMonthIndex, scheduleMap, milestoneMap]);

  function handlePreviousMonth() {
    if (isAtMinimumMonth) return;
    setViewDate(new Date(viewYear, viewMonthIndex - 1, 1));
    setSelectedDayNumber(1);
  }

  function handleNextMonth() {
    if (isAtMaximumMonth) return;
    setViewDate(new Date(viewYear, viewMonthIndex + 1, 1));
    setSelectedDayNumber(1);
  }

  function handleSelectWeek(weekNumber: number) {
    const targetWeek = monthWeeks.find((w) => w.weekNumber === weekNumber);
    if (!targetWeek) return;

    const currentMonthDay = targetWeek.days.find(
      (d) => d.getFullYear() === viewYear && d.getMonth() === viewMonthIndex,
    );
    if (currentMonthDay) {
      setSelectedDayNumber(currentMonthDay.getDate());
    } else {
      setSelectedDayNumber(targetWeek.days[0].getDate());
    }
  }

  function handleToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDayNumber(today.getDate());
  }

  function handleSelectDay(dayNumber: number, date?: Date) {
    if (date && (date.getFullYear() !== viewYear || date.getMonth() !== viewMonthIndex)) {
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
      setSelectedDayNumber(date.getDate());
      return;
    }
    setSelectedDayNumber(dayNumber);
  }

  const TIME_SLOT_TABS: { slot: TimeSlot; label: string }[] = [
    { slot: '9AM', label: '9:00 AM' },
    { slot: '12NN', label: '12:00 NN' },
    { slot: '3PM', label: '3:00 PM' },
  ];

  function renderMemberList(slot: TimeSlot) {
    const entries = entriesByTimeSlot[slot];
    if (entries.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted">
          No members scheduled for this service.
        </p>
      );
    }

    const uniqueRoles = Array.from(
      new Set(entries.map((e) => e.member.role).filter(Boolean)),
    ).sort();

    const filteredEntries =
      selectedRole === null ? entries : entries.filter((e) => e.member.role === selectedRole);

    return (
      <div className="flex flex-col gap-4">
        {uniqueRoles.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedRole === null
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-muted hover:text-text'
              }`}
            >
              All
            </button>
            {uniqueRoles.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role === selectedRole ? null : role)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedRole === role
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-border text-muted hover:text-text'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        )}
        {filteredEntries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No members for this role.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filteredEntries.map((entry) => (
              <button
                type="button"
                key={entry.member.id}
                onClick={() =>
                  navigate(ROUTE_PATHS.adminMemberDetailPattern.replace(':id', entry.member.id))
                }
                className="flex flex-col items-center gap-2 rounded-xl border border-border p-3 hover:bg-primary/5 hover:border-primary/30 transition text-center"
              >
                <Avatar
                  size="md"
                  name={entry.member.full_name}
                  avatarObjectKey={entry.member.avatar_object_key}
                  className="border-2 border-surface shadow-sm"
                />
                <div className="min-w-0 w-full">
                  <p className="truncate text-sm font-medium text-text">{entry.member.full_name}</p>
                  <p className="truncate text-xs text-muted">{entry.member.member_id}</p>
                  {entry.member.role && (
                    <p className="mt-1 truncate text-xs font-medium text-primary/70">
                      {entry.member.role}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const renderContent = () => {
    if (error) {
      return (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-red-600">
            Failed to load calendar schedules and milestones. Please refresh.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-8">
        <div>
          <SectionCard>
            {/* Milestones Month Stats Bar */}
            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Cake className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted">Birthdays this month</p>
                    <p className="text-xl font-bold text-text">{birthdayCount}</p>
                  </div>
                </div>

                <div className="hidden h-9 w-px bg-border sm:block" />

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700">
                    <HeartIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted">Wedding Anniversaries</p>
                    <p className="text-xl font-bold text-text">{anniversaryCount}</p>
                  </div>
                </div>
              </div>

              <ExportMonthMilestonesButton
                milestoneEntries={currentMonthMilestoneEntries}
                year={viewYear}
                monthIndex={viewMonthIndex}
              />
            </div>

            {/* Calendar Controls & Header */}
            <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-heading text-xl font-semibold text-text">Hub Calendar</h2>
                <p className="mt-1 text-sm text-muted">
                  View upcoming Sunday services and member milestones.
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
                  onSelectDay={handleSelectDay}
                />
              ) : (
                <DesktopScheduleCalendar
                  calendarCells={calendarCells}
                  scheduleMap={scheduleMap}
                  milestoneMap={milestoneMap}
                  selectedDayNumber={selectedDayNumber}
                  onSelectDay={handleSelectDay}
                />
              )}
            </div>
          </SectionCard>
        </div>

        {/* Selected Date Details (Stacked Sections) */}
        <div>
          <SectionCard
            title="Selected Date Details"
            subtitle={formatSelectedDate(viewYear, viewMonthIndex, selectedDayNumber)}
          >
            <div className="space-y-8">
              {/* Section 1: Member Milestones */}
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-text">
                      Birthdays &amp; Wedding Anniversaries
                    </h3>
                    <p className="text-xs text-muted">Member milestones celebrated on this day</p>
                  </div>
                  {selectedMilestones.length > 0 && (
                    <Badge variant="neutral" className="text-xs">
                      {selectedMilestones.length} milestone
                      {selectedMilestones.length === 1 ? '' : 's'}
                    </Badge>
                  )}
                </div>

                {selectedMilestones.length === 0 ? (
                  <p className="py-3 text-sm text-muted">
                    No birthdays or wedding anniversaries on this date.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedMilestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        onClick={() =>
                          navigate(
                            ROUTE_PATHS.adminMemberDetailPattern.replace(
                              ':id',
                              milestone.member.id,
                            ),
                          )
                        }
                        className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-primary/5 hover:border-primary/30 transition cursor-pointer"
                      >
                        <MilestoneAvatar
                          size="md"
                          name={milestone.member.full_name}
                          avatarObjectKey={milestone.member.avatar_object_key}
                          type={milestone.type}
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-text">
                              {milestone.member.full_name}
                            </p>
                            <MilestoneBadge type={milestone.type} />
                          </div>
                          <p className="mt-1 truncate text-xs text-muted">
                            {milestone.member.member_id} •{' '}
                            {milestone.member.nickname || 'No nickname'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Service Schedules */}
              <div className="pt-2">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-text">
                      Service Schedules
                    </h3>
                    <p className="text-xs text-muted">
                      {isCurrentSelectedSunday
                        ? 'Scheduled service volunteers and teams for this Sunday'
                        : 'Service schedules are held on Sundays'}
                    </p>
                  </div>
                  {isCurrentSelectedSunday && selectedEntries.length > 0 && (
                    <Badge variant="neutral" className="text-xs">
                      {selectedEntries.length} scheduled
                    </Badge>
                  )}
                </div>

                {isCurrentSelectedSunday ? (
                  selectedEntries.length === 0 ? (
                    <EmptyState
                      icon={<CalendarDays className="h-6 w-6" />}
                      title="No schedules on this Sunday"
                      description="No members are scheduled for this Sunday."
                      className="px-4 py-8"
                    />
                  ) : (
                    <div>
                      <div className="flex border-b border-border mb-4">
                        {TIME_SLOT_TABS.map(({ slot, label }) => {
                          const count = entriesByTimeSlot[slot].length;
                          const isActive = activeTab === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => handleTabChange(slot)}
                              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                                isActive
                                  ? 'text-primary border-b-2 border-primary -mb-px font-semibold'
                                  : 'text-muted hover:text-text'
                              }`}
                            >
                              {label}
                              {count > 0 && (
                                <span
                                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                                    isActive ? 'bg-primary text-white' : 'bg-muted/20 text-muted'
                                  }`}
                                >
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {renderMemberList(activeTab)}
                    </div>
                  )
                ) : (
                  <p className="py-3 text-sm text-muted">
                    Sunday services are only scheduled on Sundays. Select a Sunday on the calendar
                    to view volunteer teams.
                  </p>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    );
  };

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Hub Calendar"
        description="Overview of upcoming committed schedules and member milestones."
      />
      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading calendar data...">
        <div>{renderContent()}</div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
