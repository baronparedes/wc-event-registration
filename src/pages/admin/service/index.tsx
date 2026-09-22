import { useMemo, useState } from 'react';

import { endOfMonth, format, parseISO } from 'date-fns';
import { SearchX, Table, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import { Button, EmptyState } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { useServiceDashboardQuery } from '@/hooks/domain/services';

import {
  ServiceDashboardFilters,
  ServiceDashboardMetrics,
  ServiceDashboardRoleBreakdown,
} from './components';
import { type FilterMode, getLastSundayOfYear, getNearestPreviousSunday } from './constants';

export function AdminServicesPage() {
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState<FilterMode>('sunday');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [maxSunday] = useState<string>(() => getLastSundayOfYear(currentYear));

  const [selectedSunday, setSelectedSunday] = useState<string>(() => getNearestPreviousSunday());
  const [selectedYear, setSelectedYear] = useState<number>(() => currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => currentMonth);

  const queryFilters = useMemo(() => {
    if (filterMode === 'sunday') {
      const year = parseISO(selectedSunday).getFullYear();
      return { sunday_date: selectedSunday, year };
    }
    if (filterMode === 'month') {
      return { year: selectedYear, month: selectedMonth };
    }
    // Annual
    return { year: selectedYear };
  }, [filterMode, selectedSunday, selectedYear, selectedMonth]);

  const { data: stats, isLoading, isError } = useServiceDashboardQuery(queryFilters);

  const dateFilterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filterMode === 'sunday' && selectedSunday) {
      params.set('service_start_date', selectedSunday);
      params.set('service_end_date', selectedSunday);
    } else if (filterMode === 'month' && !isNaN(selectedYear) && !isNaN(selectedMonth)) {
      const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
      params.set('service_start_date', format(monthStart, 'yyyy-MM-dd'));
      params.set('service_end_date', format(endOfMonth(monthStart), 'yyyy-MM-dd'));
    } else if (filterMode === 'annual' && !isNaN(selectedYear)) {
      const annualEnd = `${selectedYear}-12-31`;
      params.set('service_start_date', `${selectedYear}-01-01`);
      params.set('service_end_date', annualEnd);
    }
    return params;
  }, [filterMode, selectedSunday, selectedYear, selectedMonth]);

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Services Dashboard"
        description="Monitor service attendance and volunteer turn-up statistics."
        breadcrumbs={[{ label: 'Services' }]}
        actions={
          <>
            <Button
              className="w-full sm:w-auto sm:inline-flex"
              variant="primaryOutline"
              onClick={() => navigate(ROUTE_PATHS.adminServiceAttendanceMigration)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
            <Button
              className="w-full sm:w-auto sm:inline-flex"
              onClick={() => navigate(ROUTE_PATHS.adminServiceAttendanceData)}
            >
              <Table className="mr-2 h-4 w-4" />
              Attendance Data
            </Button>
          </>
        }
      />
      <AdminBaseNavigation />
      <AdminPageShell.Content className="mt-6 space-y-6">
        <ServiceDashboardFilters
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          selectedSunday={selectedSunday}
          onSelectedSundayChange={setSelectedSunday}
          selectedYear={selectedYear}
          onSelectedYearChange={setSelectedYear}
          selectedMonth={selectedMonth}
          onSelectedMonthChange={setSelectedMonth}
          maxSunday={maxSunday}
        />

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : isError || !stats ? (
          <EmptyState
            icon={<SearchX className="h-8 w-8 text-muted" />}
            title="Failed to load dashboard"
            description="There was an error fetching the service dashboard statistics."
          />
        ) : (
          <div className="space-y-6">
            <ServiceDashboardMetrics stats={stats} dateFilterParams={dateFilterParams} />
            <ServiceDashboardRoleBreakdown stats={stats} dateFilterParams={dateFilterParams} />
          </div>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
