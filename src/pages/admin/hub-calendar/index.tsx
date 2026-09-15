import { useMemo } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { AdminPageShell } from '@/components/layout';
import { Button, SectionCard } from '@/components/ui';
import {
  useAdminMembersMilestonesQuery,
  useAdminMembersSchedulesQuery,
} from '@/hooks/domain/members';
import { useIsMobileViewport } from '@/hooks/utils';

import {
  DesktopScheduleCalendar,
  MilestoneStatsBar,
  MobileScheduleCalendar,
  SelectedDateDetails,
} from './components';
import { useHubCalendarData } from './hooks/useHubCalendarData';
import { useHubCalendarState } from './hooks/useHubCalendarState';

export function AdminHubCalendarPage() {
  const isMobileViewport = useIsMobileViewport();

  const schedulesQuery = useAdminMembersSchedulesQuery();
  const milestonesQuery = useAdminMembersMilestonesQuery();

  const scheduleEntries = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data]);
  const members = useMemo(() => milestonesQuery.data ?? [], [milestonesQuery.data]);

  const isLoading = schedulesQuery.isLoading || milestonesQuery.isLoading;
  const error = schedulesQuery.error || milestonesQuery.error;

  const {
    viewDate,
    viewYear,
    viewMonthIndex,
    selectedDayNumber,
    activeTab,
    selectedRole,
    isAtMinimumMonth,
    isAtMaximumMonth,
    isAtToday,
    setSelectedRole,
    handleTabChange,
    handlePreviousMonth,
    handleNextMonth,
    handleSelectWeek,
    handleToday,
    handleSelectDay,
  } = useHubCalendarState();

  const {
    calendarCells,
    scheduleMap,
    excusedMap,
    milestoneMap,
    currentMonthMilestoneEntries,
    birthdayCount,
    anniversaryCount,
    selectedEntries,
    selectedMilestones,
    isCurrentSelectedSunday,
    entriesByTimeSlot,
    monthWeeks,
    currentWeekNumber,
    weekOptions,
    mobileWeekCells,
  } = useHubCalendarData(scheduleEntries, members, viewYear, viewMonthIndex, selectedDayNumber);

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
      <div className="flex flex-col gap-4">
        <SectionCard>
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
                excusedMap={excusedMap}
                onSelectWeek={(week) => handleSelectWeek(week, monthWeeks)}
                onSelectDay={handleSelectDay}
              />
            ) : (
              <DesktopScheduleCalendar
                calendarCells={calendarCells}
                scheduleMap={scheduleMap}
                excusedMap={excusedMap}
                milestoneMap={milestoneMap}
                selectedDayNumber={selectedDayNumber}
                onSelectDay={handleSelectDay}
              />
            )}
          </div>
        </SectionCard>
        <MilestoneStatsBar
          birthdayCount={birthdayCount}
          anniversaryCount={anniversaryCount}
          currentMonthMilestoneEntries={currentMonthMilestoneEntries}
          viewYear={viewYear}
          viewMonthIndex={viewMonthIndex}
        />
        <SelectedDateDetails
          viewYear={viewYear}
          viewMonthIndex={viewMonthIndex}
          selectedDayNumber={selectedDayNumber}
          selectedMilestones={selectedMilestones}
          selectedEntries={selectedEntries}
          entriesByTimeSlot={entriesByTimeSlot}
          excusedMap={excusedMap}
          isCurrentSelectedSunday={isCurrentSelectedSunday}
          activeTab={activeTab}
          selectedRole={selectedRole}
          onTabChange={handleTabChange}
          onRoleChange={setSelectedRole}
        />
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
