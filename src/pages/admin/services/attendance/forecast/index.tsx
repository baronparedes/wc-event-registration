import { useState } from 'react';

import { addMonths, isSameMonth, subMonths } from 'date-fns';
import { Download, Share2, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { AlertBanner, Button } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { useAppSettingsQuery } from '@/hooks/domain/app-settings';
import {
  DEFAULT_FORECAST_CONFIDENCE_THRESHOLDS,
  DEFAULT_SERVICE_STAFFING_TARGETS,
} from '@/lib/domain/app-settings';
import { VolunteerStaffingTargetsModal } from '@/pages/admin/hub-calendar/components';
import type { ConfidenceThresholds } from '@/pages/admin/hub-calendar/utils/hubCalendarForecastUtils';
import type { VolunteerTargetsBySlot } from '@/pages/admin/hub-calendar/utils/volunteerStaffingUtils';
import { ServiceNavigationLinks } from '@/pages/admin/services/components';

import {
  ForecastMonthNavigator,
  ForecastMonthSummaryBar,
  ForecastMonthlyTrendChart,
  ForecastRoleGroupSelector,
  ForecastSundaySelector,
  ShareSundayForecastDialog,
  SundayForecastCard,
} from './components';
import {
  type ForecastRoleGroup,
  useAttendanceForecastData,
} from './hooks/useAttendanceForecastData';
import { buildSundayForecastCsvExport } from './utils/forecastCsvExport';

export function AdminServiceAttendanceForecastPage() {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [activeRoleGroup, setActiveRoleGroup] = useState<ForecastRoleGroup>('ALL');
  const [activeSundayKey, setActiveSundayKey] = useState<string>('ALL');
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const { data: appSettings } = useAppSettingsQuery();
  const dbTargets = appSettings?.service_staffing_targets ?? DEFAULT_SERVICE_STAFFING_TARGETS;
  const volunteerTargets: VolunteerTargetsBySlot = {
    '9AM': dbTargets['9AM'] ?? DEFAULT_SERVICE_STAFFING_TARGETS['9AM'],
    '12NN': dbTargets['12NN'] ?? DEFAULT_SERVICE_STAFFING_TARGETS['12NN'],
    '3PM': dbTargets['3PM'] ?? DEFAULT_SERVICE_STAFFING_TARGETS['3PM'],
  };
  const dbThresholds =
    appSettings?.forecast_confidence_thresholds ?? DEFAULT_FORECAST_CONFIDENCE_THRESHOLDS;
  const confidenceThresholds: ConfidenceThresholds = {
    solid: dbThresholds.solid,
    moderate: dbThresholds.moderate,
    defaultTurnupRate: dbThresholds.default_turnup_rate,
  };

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
    setActiveSundayKey('ALL');
  };

  const handleNextMonth = () => {
    setViewDate((prev) => addMonths(prev, 1));
    setActiveSundayKey('ALL');
  };

  const handleToday = () => {
    setViewDate(new Date());
    setActiveSundayKey('ALL');
  };

  const handleExportCsv = () => {
    if (!sundayForecasts.length) return;

    let url: string | null = null;
    let link: HTMLAnchorElement | null = null;

    try {
      const { csvText, filename } = buildSundayForecastCsvExport({
        sundays: sundayForecasts,
        year: viewYear,
        monthIndex: viewMonthIndex,
        selectedSundayKey: activeSundayKey,
      });

      const blob = new Blob([csvText], { type: 'text/csv; charset=utf-8' });
      url = URL.createObjectURL(blob);
      link = document.createElement('a');

      link.href = url;
      link.download = filename;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      toast.success('Attendance forecast exported to CSV');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to export attendance forecast CSV.';
      toast.error(message);
    } finally {
      if (link && document.body.contains(link)) {
        document.body.removeChild(link);
      }
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  };

  const displayedSundays =
    activeSundayKey === 'ALL'
      ? sundayForecasts
      : sundayForecasts.filter((s) => s.isoDateKey === activeSundayKey);

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Sunday Attendance Forecast"
        description="Monthly turnup expectations and role deficit forecasting for Sunday services."
        breadcrumbs={[{ label: 'Services', to: ROUTE_PATHS.adminServices }, { label: 'Forecast' }]}
        actions={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportCsv}
              className="w-full sm:w-auto"
              disabled={isLoading || isError || !sundayForecasts.length}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsShareModalOpen(true)}
              className="w-full sm:w-auto"
              disabled={isLoading || isError || !sundayForecasts.length}
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Share Forecast
            </Button>
            <Button
              type="button"
              onClick={() => setIsTargetsModalOpen(true)}
              className="w-full sm:w-auto"
            >
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              Configure Targets
            </Button>
          </div>
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

            {/* Per Sunday Tabs */}
            <ForecastSundaySelector
              sundays={sundayForecasts}
              activeSundayKey={activeSundayKey}
              onChangeSunday={setActiveSundayKey}
            />

            {/* Month Summary Bar */}
            <ForecastMonthSummaryBar summary={monthSummary} />

            {/* Role Group / Department Tabs */}
            <ForecastRoleGroupSelector
              activeGroup={activeRoleGroup}
              onChangeGroup={setActiveRoleGroup}
            />

            {/* Monthly Attendance Trendline Chart */}
            <ForecastMonthlyTrendChart
              sundays={sundayForecasts}
              roleGroupLabel={selectedRoleGroup.label}
            />

            {/* Chronological Sunday Cards with Simplified Tables */}
            <div className="space-y-6">
              {displayedSundays.map((sunday) => (
                <SundayForecastCard
                  key={sunday.isoDateKey}
                  sunday={sunday}
                  tableTitle={selectedRoleGroup.tableTitle}
                  showRoleBreakdownOption={activeRoleGroup === 'ALL'}
                />
              ))}
            </div>
          </div>
        )}

        <ShareSundayForecastDialog
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          sundays={sundayForecasts}
          initialSundayKey={activeSundayKey}
          roleGroupLabel={selectedRoleGroup.label}
        />

        <VolunteerStaffingTargetsModal
          isOpen={isTargetsModalOpen}
          onClose={() => setIsTargetsModalOpen(false)}
          targets={volunteerTargets}
          onSaveTargets={() => {}}
          thresholds={confidenceThresholds}
          onSaveThresholds={() => {}}
          initialSlot="9AM"
        />
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
