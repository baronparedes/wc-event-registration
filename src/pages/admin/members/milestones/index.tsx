import { useMemo, useState } from 'react';

import { Cake, CalendarDays, ChevronLeft, ChevronRight, HeartIcon } from 'lucide-react';

import { AdminPageShell, AdminSubNavLink } from '@/components/layout';
import { Avatar, Badge, Button, EmptyState, SectionCard } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { useAdminMembersMilestonesQuery } from '@/hooks/domain/members';
import { useIsMobileViewport } from '@/hooks/utils';
import { type AdminMember, MEMBER_EXTRA_METADATA_KEYS } from '@/lib/domain/members';
import { formatDayMonth } from '@/lib/infrastructure';

import { DesktopMilestonesCalendar } from './components/DesktopMilestonesCalendar';
import { ExportMonthMilestonesButton } from './components/ExportMonthMilestonesButton';
import { MobileMilestonesCalendar } from './components/MobileMilestonesCalendar';

export type MilestoneType = 'birthday' | 'wedding_anniversary';

export type MilestoneEntry = {
  id: string;
  type: MilestoneType;
  member: AdminMember;
};

export type CalendarCell = {
  dayNumber: number | null;
  monthDayKey: string | null;
  isCurrentMonth: boolean;
};

export type WeekCell = {
  date: Date;
  monthDayKey: string;
  entries: MilestoneEntry[];
};

type MilestoneDefinition = {
  type: MilestoneType;
  label: string;
  labelPlural: string;
  icon: typeof Cake;
  sourceDate: (member: AdminMember) => string | null;
  badgeClassName: string;
};

const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  {
    type: 'birthday',
    label: 'Birthday',
    labelPlural: 'Birthdays',
    icon: Cake,
    sourceDate: (member) => member.date_of_birth,
    badgeClassName: 'border border-primary/20 bg-primary/10',
  },
  {
    type: 'wedding_anniversary',
    label: 'Wedding Anniversary',
    labelPlural: 'Wedding Anniversaries',
    icon: HeartIcon,
    sourceDate: (member) =>
      member.extra_metadata[MEMBER_EXTRA_METADATA_KEYS.weddingAnniversaryDate] ?? null,
    badgeClassName: 'border border-red-200 bg-red-50 !text-red-800',
  },
];

function toMonthDayKey(month: number, day: number): string {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function buildCalendarCells(year: number, monthIndex: number): CalendarCell[] {
  const firstDayIndex = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const cells: CalendarCell[] = [];

  for (let index = 0; index < firstDayIndex; index += 1) {
    cells.push({ dayNumber: null, monthDayKey: null, isCurrentMonth: false });
  }

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    cells.push({
      dayNumber,
      monthDayKey: toMonthDayKey(monthIndex + 1, dayNumber),
      isCurrentMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ dayNumber: null, monthDayKey: null, isCurrentMonth: false });
  }

  return cells;
}

function getWeekWindowStartDay(dayNumber: number): number {
  return dayNumber - ((dayNumber - 1) % 7);
}

function getLastWeekWindowStartDay(daysInMonth: number): number {
  return daysInMonth - ((daysInMonth - 1) % 7);
}

function getWeekStartDayFromWeekNumber(weekNumber: number): number {
  return (weekNumber - 1) * 7 + 1;
}

function buildMobileWeekCells(
  year: number,
  monthIndex: number,
  weekStartDay: number,
  daysInMonth: number,
  milestoneMap: Map<string, MilestoneEntry[]>,
): WeekCell[] {
  const weekEndDay = Math.min(weekStartDay + 6, daysInMonth);

  return Array.from({ length: weekEndDay - weekStartDay + 1 }, (_, index) => {
    const dayNumber = weekStartDay + index;
    const date = new Date(year, monthIndex, dayNumber);
    const monthDayKey = toMonthDayKey(date.getMonth() + 1, date.getDate());

    return {
      date,
      monthDayKey,
      entries: milestoneMap.get(monthDayKey) ?? [],
    } satisfies WeekCell;
  });
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
  const sourceDate =
    MILESTONE_DEFINITIONS.find((definition) => definition.type === type)?.sourceDate(member) ??
    null;
  const parsed = parseMonthDay(sourceDate);

  return parsed ? toMonthDayKey(parsed.month, parsed.day) : null;
}

function getMilestoneTypeLabel(type: MilestoneType): string {
  return MILESTONE_DEFINITIONS.find((definition) => definition.type === type)?.label ?? type;
}

function getMilestoneTypeIcon(type: MilestoneType) {
  const Icon = MILESTONE_DEFINITIONS.find((definition) => definition.type === type)?.icon ?? Cake;

  return <Icon className="h-3.5 w-3.5" />;
}

function getMilestoneTypeBadgeClass(type: MilestoneType): string {
  return (
    MILESTONE_DEFINITIONS.find((definition) => definition.type === type)?.badgeClassName ??
    'border border-primary/20 bg-primary/10 text-primary'
  );
}

function getMilestoneTypeDateText(entry: MilestoneEntry): string {
  const monthDayKey = getMonthDayKeyFromMember(entry.member, entry.type);
  if (!monthDayKey) {
    return '';
  }

  const [month, day] = monthDayKey.split('-').map(Number);
  return formatDayMonth(`2000-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
}

function formatSelectedDate(year: number, monthIndex: number, dayNumber: number): string {
  return new Date(year, monthIndex, dayNumber).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function AdminMemberMilestonesPage() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const minViewDate = new Date(currentYear, 0, 1);
  const maxViewDate = new Date(currentYear + 1, 11, 1);
  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDayNumber, setSelectedDayNumber] = useState(today.getDate());
  const [mobileWeekStartDay, setMobileWeekStartDay] = useState(
    getWeekWindowStartDay(today.getDate()),
  );
  const isMobileViewport = useIsMobileViewport();

  const membersQuery = useAdminMembersMilestonesQuery();
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const isLoading = membersQuery.isLoading;
  const error = membersQuery.error;

  const viewYear = viewDate.getFullYear();
  const viewMonthIndex = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(viewYear, viewMonthIndex);
  const calendarCells = buildCalendarCells(viewYear, viewMonthIndex);
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

    for (const entries of grouped.values()) {
      entries.sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === 'birthday' ? -1 : 1;
        }

        return left.member.full_name.localeCompare(right.member.full_name);
      });
    }

    return grouped;
  }, [milestoneEntries]);

  const selectedMonthDayKey = toMonthDayKey(
    viewMonthIndex + 1,
    Math.min(selectedDayNumber, daysInMonth),
  );
  const selectedEntries = milestoneMap.get(selectedMonthDayKey) ?? [];

  const currentMonthEntries = milestoneEntries.filter((entry) => {
    const key = getMonthDayKeyFromMember(entry.member, entry.type);
    return key?.startsWith(toMonthDayKey(viewMonthIndex + 1, 1).slice(0, 2)) ?? false;
  });

  const birthdayCount = currentMonthEntries.filter((entry) => entry.type === 'birthday').length;
  const weddingAnniversaryCount = currentMonthEntries.filter(
    (entry) => entry.type === 'wedding_anniversary',
  ).length;
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
    milestoneMap,
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

  const renderContent = () => {
    if (error) {
      return (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-red-600">Failed to load member milestones. Please refresh.</p>
        </div>
      );
    }

    if (members.length === 0) {
      return (
        <div className="rounded-2xl border border-border bg-surface px-6 py-12">
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="No active members"
            description="Add active members first, then their milestones will appear here."
          />
        </div>
      );
    }

    return (
      <div className="grid gap-6 grid-cols-1">
        <SectionCard>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold text-text">
                {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h2>
              <p className="mt-2 text-sm text-muted">
                Quick milestone totals for the month in view.
              </p>
            </div>

            <ExportMonthMilestonesButton
              milestoneEntries={currentMonthEntries}
              year={viewYear}
              monthIndex={viewMonthIndex}
            />
          </div>
          <div className="grid gap-3 xs:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Birthdays</p>
              <p className="mt-2 text-3xl font-bold text-text">{birthdayCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Wedding Anniversaries
              </p>
              <p className="mt-2 text-3xl font-bold text-text">{weddingAnniversaryCount}</p>
            </div>
          </div>
        </SectionCard>
        <SectionCard>
          <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-heading text-xl font-semibold text-text">Calendar</h2>
              <p className="mt-2 text-sm text-muted">
                Select a day to see the matching milestones.
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
              <MobileMilestonesCalendar
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
              <DesktopMilestonesCalendar
                calendarCells={calendarCells}
                milestoneMap={milestoneMap}
                selectedDayNumber={selectedDayNumber}
                onSelectDay={setSelectedDayNumber}
              />
            )}
          </div>
        </SectionCard>
        <SectionCard
          title="Selected Day"
          subtitle={formatSelectedDate(viewYear, viewMonthIndex, selectedDayNumber)}
        >
          {selectedEntries.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="No milestones on this date"
              description="Pick another day in the month to inspect member milestones."
              className="px-4 py-10"
            />
          ) : (
            <div className="space-y-1">
              {selectedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 border-b border-border last:border-b-0"
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
                      <Badge
                        className={getMilestoneTypeBadgeClass(entry.type)}
                        icon={getMilestoneTypeIcon(entry.type)}
                      >
                        {getMilestoneTypeLabel(entry.type)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {entry.member.member_id} • {entry.member.nickname || 'No nickname'}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {`${getMilestoneTypeLabel(entry.type)}: ${getMilestoneTypeDateText(entry)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    );
  };

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[{ label: 'Members', to: ROUTE_PATHS.adminMembers }, { label: 'Milestones' }]}
        title="Member Milestones"
        description="Browse milestones in a month view."
      />

      <AdminPageShell.SubNav>
        <AdminSubNavLink to={ROUTE_PATHS.adminMembers}>Members</AdminSubNavLink>
        <AdminSubNavLink to={ROUTE_PATHS.adminMemberMilestones}>Milestones</AdminSubNavLink>
      </AdminPageShell.SubNav>

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading member milestones...">
        {renderContent()}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
