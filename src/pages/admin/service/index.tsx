import React, { useMemo, useState } from 'react';

import { format, getDay } from 'date-fns';
import { Briefcase, Clock, Download, Handshake, SearchX, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import { Button, EmptyState } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { useServiceDashboardQuery } from '@/hooks/domain/services';

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const TIME_SLOTS = ['9:00 AM', '12NN', '3:00 PM'] as const;

export function AdminServicesPage() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<'month' | 'sunday'>('month');

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedSunday, setSelectedSunday] = useState<string>(() => {
    // Default to nearest past sunday or today if sunday
    const d = new Date();
    const day = getDay(d);
    const diff = d.getDate() - day;
    return format(new Date(d.setDate(diff)), 'yyyy-MM-dd');
  });

  const queryFilters = useMemo(() => {
    if (filterType === 'month') {
      return { year: selectedYear, month: selectedMonth };
    }
    return { sunday_date: selectedSunday, year: parseInt(selectedSunday.substring(0, 4)) };
  }, [filterType, selectedYear, selectedMonth, selectedSunday]);

  const { data: stats, isLoading, isError } = useServiceDashboardQuery(queryFilters);

  // Generate sundays for the selected month/year for the dropdown
  const sundaysInMonth = useMemo(() => {
    const sundays = [];
    if (filterType === 'sunday') {
      // Need a way to select a Sunday, let's just create a list of recent sundays
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      const day = getDay(d);
      const lastSunday = new Date(d);
      lastSunday.setDate(lastSunday.getDate() - day);

      for (let i = 0; i < 12; i++) {
        const s = new Date(lastSunday);
        s.setDate(s.getDate() - i * 7);
        sundays.push(format(s, 'yyyy-MM-dd'));
      }
    }
    return sundays;
  }, [filterType]);

  const handleSundayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSunday(e.target.value);
  };

  const getTurnupPercentage = (present: number, committed: number) => {
    if (committed === 0) return 0;
    return Math.round((present / committed) * 100);
  };

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Services Dashboard"
        description="Monitor service attendance and volunteer turn-up statistics."
        breadcrumbs={[{ label: 'Services' }]}
      />
      <AdminBaseNavigation />
      <AdminPageShell.Content className="mt-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter by:</span>
            <select
              value={filterType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFilterType(e.target.value as 'month' | 'sunday')
              }
              className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="month">Month & Year</option>
              <option value="sunday">Specific Sunday</option>
            </select>
          </div>

          {filterType === 'month' ? (
            <>
              <select
                value={selectedMonth.toString()}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSelectedMonth(parseInt(e.target.value))
                }
                className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={(i + 1).toString()}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear.toString()}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSelectedYear(parseInt(e.target.value))
                }
                className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <select
              value={selectedSunday}
              onChange={handleSundayChange}
              className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {sundaysInMonth.map((d) => (
                <option key={d} value={d}>
                  {format(new Date(d), 'MMM d, yyyy')}
                </option>
              ))}
            </select>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(ROUTE_PATHS.adminServiceAttendanceMigration)}
            >
              <Download className="mr-2 h-4 w-4" />
              Import Records
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : isError || !stats ? (
          <EmptyState
            icon={<SearchX className="h-8 w-8 text-gray-400" />}
            title="Failed to load dashboard"
            description="There was an error fetching the service dashboard statistics."
          />
        ) : (
          <div className="space-y-8">
            {/* Top Level Stats */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              {/* Committed */}
              <div className="flex overflow-hidden rounded-lg border bg-white shadow-sm">
                <div className="flex w-24 flex-col items-center justify-center bg-blue-50 p-4 text-blue-600">
                  <Handshake className="mb-2 h-8 w-8" />
                  <span className="text-center text-xs font-semibold uppercase tracking-wider">
                    Committed
                  </span>
                </div>
                <div className="grid flex-1 grid-cols-3 divide-x">
                  {TIME_SLOTS.map((ts) => (
                    <div key={ts} className="flex flex-col items-center justify-center p-4">
                      <span className="mb-1 text-sm font-medium text-gray-500">{ts}</span>
                      <span className="text-2xl font-bold">{stats.time_slots[ts].committed}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Present */}
              <div className="flex overflow-hidden rounded-lg border bg-white shadow-sm">
                <div className="flex w-24 flex-col items-center justify-center bg-emerald-50 p-4 text-emerald-600">
                  <Users className="mb-2 h-8 w-8" />
                  <span className="text-center text-xs font-semibold uppercase tracking-wider">
                    Present
                    <br />
                    <span className="text-[10px] text-emerald-500">(No walk-ins)</span>
                  </span>
                </div>
                <div className="grid flex-1 grid-cols-3 divide-x">
                  {TIME_SLOTS.map((ts) => (
                    <div key={ts} className="flex flex-col items-center justify-center p-4">
                      <span className="mb-1 text-sm font-medium text-gray-500">{ts}</span>
                      <span className="text-2xl font-bold">{stats.time_slots[ts].present}</span>
                      {stats.time_slots[ts].walk_ins > 0 && (
                        <div className="mt-1 w-full bg-red-100 px-2 py-0.5 text-center text-xs font-bold text-red-600">
                          {stats.time_slots[ts].walk_ins} Walk-ins
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Turn-up % */}
              <div className="flex overflow-hidden rounded-lg border bg-white shadow-sm">
                <div className="flex w-24 flex-col items-center justify-center bg-indigo-50 p-4 text-indigo-600">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border-4 border-indigo-200">
                    <span className="font-bold">%</span>
                  </div>
                  <span className="text-center text-xs font-semibold uppercase tracking-wider">
                    Turn-Up
                  </span>
                </div>
                <div className="grid flex-1 grid-cols-3 divide-x">
                  {TIME_SLOTS.map((ts) => {
                    const perc = getTurnupPercentage(
                      stats.time_slots[ts].present,
                      stats.time_slots[ts].committed,
                    );
                    const isLow = perc < 50;
                    return (
                      <div
                        key={ts}
                        className={`flex flex-col items-center justify-center p-4 ${isLow ? 'bg-red-50' : 'bg-emerald-50'}`}
                      >
                        <span className="mb-1 text-sm font-medium text-gray-700">{ts}</span>
                        <span
                          className={`text-2xl font-bold ${isLow ? 'text-red-700' : 'text-emerald-700'}`}
                        >
                          {perc}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Role Breakdowns */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {stats.roles.map((role) => (
                <div
                  key={role}
                  className="flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm"
                >
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      {role}
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 divide-x flex-1">
                    {TIME_SLOTS.map((ts) => (
                      <div key={ts} className="flex flex-col items-center justify-center p-3">
                        <span className="mb-1 text-xs font-medium text-gray-500">{ts}</span>
                        <span className="text-lg font-bold">
                          {stats.time_slots[ts].roles[role] || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Late / Tardy */}
              <div className="flex flex-col overflow-hidden rounded-lg border border-orange-200 bg-white shadow-sm">
                <div className="bg-orange-50 px-4 py-2 border-b border-orange-100">
                  <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    LATE / TARDY
                  </h3>
                </div>
                <div className="grid grid-cols-3 divide-x flex-1">
                  {TIME_SLOTS.map((ts) => (
                    <div key={ts} className="flex flex-col items-center justify-center p-3">
                      <span className="mb-1 text-xs font-medium text-gray-500">{ts}</span>
                      <span className="text-lg font-bold text-orange-700">
                        {stats.time_slots[ts].late_tardy}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Walk-in */}
              <div className="flex flex-col overflow-hidden rounded-lg border border-blue-200 bg-white shadow-sm">
                <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
                  <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    TOTAL WALK-IN
                  </h3>
                </div>
                <div className="grid grid-cols-3 divide-x flex-1">
                  {TIME_SLOTS.map((ts) => (
                    <div key={ts} className="flex flex-col items-center justify-center p-3">
                      <span className="mb-1 text-xs font-medium text-gray-500">{ts}</span>
                      <span className="text-lg font-bold text-blue-700">
                        {stats.time_slots[ts].walk_ins}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
