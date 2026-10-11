import { useState } from 'react';

import { addMonths, isSameMonth, subMonths } from 'date-fns';
import { SlidersHorizontal } from 'lucide-react';

import { AdminPageShell } from '@/components/layout';
import { AlertBanner, Button } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { VolunteerStaffingTargetsModal } from '@/pages/admin/hub-calendar/components';
import {
  type ConfidenceThresholds,
  getStoredConfidenceThresholds,
} from '@/pages/admin/hub-calendar/utils/hubCalendarForecastUtils';
import {
  type VolunteerTargetsBySlot,
  getStoredVolunteerTargets,
} from '@/pages/admin/hub-calendar/utils/volunteerStaffingUtils';
import { ServiceNavigationLinks } from '@/pages/admin/services/components';

import {
  ForecastMonthNavigator,
  ForecastMonthSummaryBar,
  ForecastRoleGroupSelector,
  SundayForecastCard,
} from './components';
import {
  type ForecastRoleGroup,
  useAttendanceForecastData,
} from './hooks/useAttendanceForecastData';

export function AdminServiceAttendanceForecastPage() {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [activeRoleGroup, setActiveRoleGroup] = useState<ForecastRoleGroup>('USHER_BACKROOM');
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState(false);

  const [volunteerTargets, setVolunteerTargets] = useState<VolunteerTargetsBySlot>(() =>
    getStoredVolunteerTargets(),
  );
  const [confidenceThresholds, setConfidenceThresholds] = useState<ConfidenceThresholds>(() =>
    getStoredConfidenceThresholds(),
  );

  const viewYear = viewDate.getFullYear();
  const viewMonthIndex = viewDate.getMonth();
  const isCurrentMonth = isSameMonth(viewDate, new Date());

  const {
    sundayForecasts,
    monthSummary,
    selectedRoleGroup,
    isLoading,
    isError,
    refetch,
    evaluationWindow,
  } = useAttendanceForecastData({
    viewYear,
    viewMonthIndex,
    activeRoleGroup,
    targets: volunteerTargets,
    thresholds: confidenceThresholds,
  });

  const handlePreviousMonth = () => {
    setViewDate((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => addMonths(prev, 1));
  };

  const handleToday = () => {
    setViewDate(new Date());
  };

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Sunday Attendance Forecast"
        description="Monthly turnup expectations and role deficit forecasting for Sunday services."
        breadcrumbs={[{ label: 'Services', to: ROUTE_PATHS.adminServices }, { label: 'Forecast' }]}
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsTargetsModalOpen(true)}
            className="w-full sm:w-auto"
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Configure Targets
          </Button>
        }
      />
      <ServiceNavigationLinks />

      <AdminPageShell.Content
        isLoading={isLoading}
        loadingMessage="Calculating attendance forecasts..."
      >
        {isError ? (
          <div className="space-y-4">
            <AlertBanner
              variant="error"
              description="Failed to load service schedules or attendance statistics. Please try again."
            />
            <Button type="button" variant="secondary" onClick={refetch}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Month Navigation */}
            <ForecastMonthNavigator
              viewDate={viewDate}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
              onToday={handleToday}
              isCurrentMonth={isCurrentMonth}
              evaluationWindow={evaluationWindow}
            />

            {/* Role Group / Department Tabs */}
            <ForecastRoleGroupSelector
              activeGroup={activeRoleGroup}
              onChangeGroup={setActiveRoleGroup}
            />

            {/* Month Summary Bar */}
            <ForecastMonthSummaryBar summary={monthSummary} />

            {/* Chronological Sunday Cards with Simplified Tables */}
            <div className="space-y-6">
              {sundayForecasts.map((sunday) => (
                <SundayForecastCard
                  key={sunday.isoDateKey}
                  sunday={sunday}
                  tableTitle={selectedRoleGroup.tableTitle}
                />
              ))}
            </div>
          </div>
        )}

        <VolunteerStaffingTargetsModal
          isOpen={isTargetsModalOpen}
          onClose={() => setIsTargetsModalOpen(false)}
          targets={volunteerTargets}
          onSaveTargets={setVolunteerTargets}
          thresholds={confidenceThresholds}
          onSaveThresholds={setConfidenceThresholds}
          initialSlot="9AM"
        />
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
