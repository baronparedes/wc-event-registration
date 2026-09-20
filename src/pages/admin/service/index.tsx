import { useMemo, useState } from 'react';

import { addDays, format, getDay, parseISO, subDays } from 'date-fns';
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Handshake,
  Percent,
  SearchX,
  UserCheck,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import {
  Badge,
  Button,
  EmptyState,
  FormSelectField,
  SectionCard,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { useServiceDashboardQuery } from '@/hooks/domain/services';

const MIN_YEAR = 2025;

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
const TIME_SLOTS = ['9AM', '12NN', '3PM'] as const;

type FilterMode = 'sunday' | 'month' | 'annual';

/** Returns the date string (YYYY-MM-DD) of the nearest previous Sunday (or today if Sunday) */
function getNearestPreviousSunday(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = getDay(d);
  return format(subDays(d, day), 'yyyy-MM-dd');
}

export function AdminServicesPage() {
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState<FilterMode>('sunday');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [maxSunday] = useState<string>(() => getNearestPreviousSunday());
  const minDateStr = `${MIN_YEAR}-01-01`;

  const [selectedSunday, setSelectedSunday] = useState<string>(() => maxSunday);
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

  // Boundary conditions
  const canGoPrevSunday = format(subDays(parseISO(selectedSunday), 7), 'yyyy-MM-dd') >= minDateStr;
  const canGoNextSunday = selectedSunday < maxSunday;

  const canGoPrevMonth = !(selectedYear <= MIN_YEAR && selectedMonth <= 1);
  const canGoNextMonth = !(selectedYear >= currentYear && selectedMonth >= currentMonth);

  const canGoPrevYear = selectedYear > MIN_YEAR;
  const canGoNextYear = selectedYear < currentYear;

  // Handlers for stepping forward/backward
  const handlePrevSunday = () => {
    const prev = subDays(parseISO(selectedSunday), 7);
    const prevStr = format(prev, 'yyyy-MM-dd');
    if (prevStr >= minDateStr) {
      setSelectedSunday(prevStr);
    }
  };

  const handleNextSunday = () => {
    const next = addDays(parseISO(selectedSunday), 7);
    const nextStr = format(next, 'yyyy-MM-dd');
    if (nextStr <= maxSunday) {
      setSelectedSunday(nextStr);
    }
  };

  const handlePrevMonth = () => {
    if (selectedYear <= MIN_YEAR && selectedMonth <= 1) return;
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedYear >= currentYear && selectedMonth >= currentMonth) return;
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handlePrevYear = () => {
    if (selectedYear > MIN_YEAR) {
      setSelectedYear((y) => y - 1);
    }
  };

  const handleNextYear = () => {
    if (selectedYear < currentYear) {
      setSelectedYear((y) => y + 1);
    }
  };

  // Generate Sunday options starting from maxSunday down to MIN_YEAR
  const sundayOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    let cur = parseISO(maxSunday);
    const minDate = parseISO(minDateStr);

    while (cur >= minDate) {
      options.push({
        value: format(cur, 'yyyy-MM-dd'),
        label: format(cur, 'EEE, MMM d, yyyy'),
      });
      cur = subDays(cur, 7);
    }

    return options;
  }, [maxSunday, minDateStr]);

  // Max month is current month for currentYear
  const monthOptions = useMemo(() => {
    const maxMonthIndex = selectedYear === currentYear ? currentMonth : 12;
    return MONTHS.slice(0, maxMonthIndex).map((m, i) => ({
      value: (i + 1).toString(),
      label: m,
    }));
  }, [selectedYear, currentYear, currentMonth]);

  // Min year is 2025 up to currentYear
  const yearOptions = useMemo(() => {
    const years: Array<{ value: string; label: string }> = [];
    for (let y = currentYear; y >= MIN_YEAR; y--) {
      years.push({
        value: y.toString(),
        label: y.toString(),
      });
    }
    return years;
  }, [currentYear]);

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
        actions={
          <Button onClick={() => navigate(ROUTE_PATHS.adminServiceAttendanceMigration)}>
            <Download className="mr-2 h-4 w-4" />
            Import Records
          </Button>
        }
      />
      <AdminBaseNavigation />
      <AdminPageShell.Content className="mt-6 space-y-6">
        {/* Filter Controls Card */}
        <SectionCard wrapperClassName="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Filter By
              </span>
              <Tabs
                value={filterMode}
                onValueChange={(val) => setFilterMode(val as FilterMode)}
                className="w-auto"
              >
                <TabsList
                  containerClassName="w-auto justify-center"
                  className="w-auto justify-center"
                >
                  <TabsTrigger value="sunday" className="px-4 sm:px-5 py-1.5 sm:py-2 text-sm">
                    Sunday
                  </TabsTrigger>
                  <TabsTrigger value="month" className="px-4 sm:px-5 py-1.5 sm:py-2 text-sm">
                    Month
                  </TabsTrigger>
                  <TabsTrigger value="annual" className="px-4 sm:px-5 py-1.5 sm:py-2 text-sm">
                    Annual
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex w-full justify-center sm:w-auto">
              {filterMode === 'sunday' && (
                <div className="flex w-full items-center justify-center gap-1.5 sm:w-auto sm:gap-2">
                  <Button
                    type="button"
                    variant="default"
                    disabled={!canGoPrevSunday}
                    className="h-11 w-11 shrink-0 p-0 shadow-xs transition hover:bg-primary/90 focus:!ring-0 focus:!shadow-none focus-visible:!ring-2 focus-visible:!ring-primary/50 disabled:opacity-40 disabled:pointer-events-none"
                    onClick={handlePrevSunday}
                    aria-label="Previous Sunday"
                    title="Previous Sunday"
                  >
                    <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
                  </Button>
                  <div className="min-w-0 flex-1 sm:w-64 sm:flex-initial">
                    <FormSelectField
                      ariaLabel="Select Sunday"
                      value={selectedSunday}
                      onChange={setSelectedSunday}
                      options={sundayOptions}
                      selectClassName="h-11"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    disabled={!canGoNextSunday}
                    className="h-11 w-11 shrink-0 p-0 shadow-xs transition hover:bg-primary/90 focus:!ring-0 focus:!shadow-none focus-visible:!ring-2 focus-visible:!ring-primary/50 disabled:opacity-40 disabled:pointer-events-none"
                    onClick={handleNextSunday}
                    aria-label="Next Sunday"
                    title="Next Sunday"
                  >
                    <ChevronRight className="h-5 w-5 stroke-[2.5]" />
                  </Button>
                </div>
              )}

              {filterMode === 'month' && (
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <Button
                    type="button"
                    variant="default"
                    disabled={!canGoPrevMonth}
                    className="h-11 w-11 shrink-0 p-0 shadow-xs transition hover:bg-primary/90 focus:!ring-0 focus:!shadow-none focus-visible:!ring-2 focus-visible:!ring-primary/50 disabled:opacity-40 disabled:pointer-events-none"
                    onClick={handlePrevMonth}
                    aria-label="Previous Month"
                    title="Previous Month"
                  >
                    <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
                  </Button>
                  <div className="w-28 sm:w-36">
                    <FormSelectField
                      ariaLabel="Select month"
                      value={selectedMonth.toString()}
                      onChange={(val) => setSelectedMonth(parseInt(val))}
                      options={monthOptions}
                      selectClassName="h-11"
                    />
                  </div>
                  <div className="w-24 sm:w-28">
                    <FormSelectField
                      ariaLabel="Select year"
                      value={selectedYear.toString()}
                      onChange={(val) => {
                        const nextYear = parseInt(val);
                        setSelectedYear(nextYear);
                        if (nextYear === currentYear && selectedMonth > currentMonth) {
                          setSelectedMonth(currentMonth);
                        }
                      }}
                      options={yearOptions}
                      selectClassName="h-11"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    disabled={!canGoNextMonth}
                    className="h-11 w-11 shrink-0 p-0 shadow-xs transition hover:bg-primary/90 focus:!ring-0 focus:!shadow-none focus-visible:!ring-2 focus-visible:!ring-primary/50 disabled:opacity-40 disabled:pointer-events-none"
                    onClick={handleNextMonth}
                    aria-label="Next Month"
                    title="Next Month"
                  >
                    <ChevronRight className="h-5 w-5 stroke-[2.5]" />
                  </Button>
                </div>
              )}

              {filterMode === 'annual' && (
                <div className="flex w-full items-center justify-center gap-1.5 sm:w-auto sm:gap-2">
                  <Button
                    type="button"
                    variant="default"
                    disabled={!canGoPrevYear}
                    className="h-11 w-11 shrink-0 p-0 shadow-xs transition hover:bg-primary/90 focus:!ring-0 focus:!shadow-none focus-visible:!ring-2 focus-visible:!ring-primary/50 disabled:opacity-40 disabled:pointer-events-none"
                    onClick={handlePrevYear}
                    aria-label="Previous Year"
                    title="Previous Year"
                  >
                    <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
                  </Button>
                  <div className="min-w-0 flex-1 sm:w-32 sm:flex-initial">
                    <FormSelectField
                      ariaLabel="Select year"
                      value={selectedYear.toString()}
                      onChange={(val) => setSelectedYear(parseInt(val))}
                      options={yearOptions}
                      selectClassName="h-11"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    disabled={!canGoNextYear}
                    className="h-11 w-11 shrink-0 p-0 shadow-xs transition hover:bg-primary/90 focus:!ring-0 focus:!shadow-none focus-visible:!ring-2 focus-visible:!ring-primary/50 disabled:opacity-40 disabled:pointer-events-none"
                    onClick={handleNextYear}
                    aria-label="Next Year"
                    title="Next Year"
                  >
                    <ChevronRight className="h-5 w-5 stroke-[2.5]" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Dashboard Content */}
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
          (() => {
            const getSlot = (ts: (typeof TIME_SLOTS)[number]) =>
              stats.time_slots?.[ts] ?? {
                committed: 0,
                present: 0,
                walk_ins: 0,
                late_tardy: 0,
                roles: {},
              };

            const totalCommitted = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).committed, 0);
            const totalPresent = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).present, 0);
            const overallTurnup = getTurnupPercentage(totalPresent, totalCommitted);

            const totalLateTardy = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).late_tardy, 0);
            const totalWalkIns = TIME_SLOTS.reduce((sum, ts) => sum + getSlot(ts).walk_ins, 0);

            return (
              <div className="space-y-6">
                {/* Primary Metric Cards */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Committed */}
                  <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Handshake className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-heading font-semibold text-text">
                            Committed
                          </h3>
                          <p className="truncate text-xs text-muted">Expected volunteers</p>
                        </div>
                      </div>
                      <Badge variant="default" className="shrink-0">
                        {totalCommitted} Total
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((ts) => (
                        <div
                          key={ts}
                          className="flex h-28 flex-col items-center justify-between rounded-xl border border-border/50 bg-background p-2.5 text-center"
                        >
                          <span className="text-xs font-medium text-muted">{ts}</span>
                          <span className="font-heading text-2xl font-bold text-text">
                            {getSlot(ts).committed}
                          </span>
                          <div className="flex h-5 w-full items-center justify-center">
                            <span className="text-[10px] text-muted">—</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Present */}
                  <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                          <UserCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-heading font-semibold text-text">Present</h3>
                          <p className="truncate text-xs text-muted">Scheduled turn-up</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {totalPresent} Total
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((ts) => {
                        const slot = getSlot(ts);
                        return (
                          <div
                            key={ts}
                            className="flex h-28 flex-col items-center justify-between rounded-xl border border-border/50 bg-background p-2.5 text-center"
                          >
                            <span className="text-xs font-medium text-muted">{ts}</span>
                            <span className="font-heading text-2xl font-bold text-text">
                              {slot.present}
                            </span>
                            <div className="flex h-5 w-full items-center justify-center">
                              {slot.walk_ins > 0 ? (
                                <span className="inline-flex items-center rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                                  +{slot.walk_ins} walk-in
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted">—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Turn-up % */}
                  <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-text">
                          <Percent className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-heading font-semibold text-text">
                            Turn-Up Rate
                          </h3>
                          <p className="truncate text-xs text-muted">Attended vs Committed</p>
                        </div>
                      </div>
                      <Badge
                        variant={overallTurnup < 50 ? 'destructive' : 'default'}
                        className="shrink-0"
                      >
                        {overallTurnup}% Avg
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((ts) => {
                        const slot = getSlot(ts);
                        const perc = getTurnupPercentage(slot.present, slot.committed);
                        const isLow = perc < 50;
                        return (
                          <div
                            key={ts}
                            className={`flex h-28 flex-col items-center justify-between rounded-xl border p-2.5 text-center transition-colors ${
                              isLow
                                ? 'border-danger/30 bg-danger/5'
                                : 'border-border/50 bg-background'
                            }`}
                          >
                            <span className="text-xs font-medium text-muted">{ts}</span>
                            <span
                              className={`font-heading text-2xl font-bold ${
                                isLow ? 'text-danger' : 'text-primary'
                              }`}
                            >
                              {perc}%
                            </span>
                            <div className="flex h-5 w-full items-center justify-center">
                              <span className="text-[10px] font-medium text-muted">
                                {slot.present}/{slot.committed}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Secondary Exceptions: Late/Tardy & Total Walk-Ins */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Late / Tardy */}
                  <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-text">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-heading font-semibold text-text">
                            Late / Tardy
                          </h3>
                          <p className="truncate text-xs text-muted">Override check-ins</p>
                        </div>
                      </div>
                      <Badge variant="accent" className="shrink-0">
                        {totalLateTardy} Total
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((ts) => (
                        <div
                          key={ts}
                          className="flex h-28 flex-col items-center justify-between rounded-xl border border-border/50 bg-background p-2.5 text-center"
                        >
                          <span className="text-xs font-medium text-muted">{ts}</span>
                          <span className="font-heading text-2xl font-bold text-text">
                            {getSlot(ts).late_tardy}
                          </span>
                          <div className="flex h-5 w-full items-center justify-center">
                            <span className="text-[10px] text-muted">—</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Walk-In */}
                  <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-heading font-semibold text-text">
                            Total Walk-In
                          </h3>
                          <p className="truncate text-xs text-muted">Uncommitted attendees</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {totalWalkIns} Total
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((ts) => (
                        <div
                          key={ts}
                          className="flex h-28 flex-col items-center justify-between rounded-xl border border-border/50 bg-background p-2.5 text-center"
                        >
                          <span className="text-xs font-medium text-muted">{ts}</span>
                          <span className="font-heading text-2xl font-bold text-text">
                            {getSlot(ts).walk_ins}
                          </span>
                          <div className="flex h-5 w-full items-center justify-center">
                            <span className="text-[10px] text-muted">—</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Role Breakdowns */}
                <SectionCard
                  title="Attendance by Role"
                  subtitle="Volunteer counts per role across service time slots"
                  contentClassName="mt-4"
                >
                  {(stats.roles ?? []).length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted">
                      No volunteer roles recorded for this period.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {(stats.roles ?? []).map((role) => {
                        const roleTotal = TIME_SLOTS.reduce(
                          (sum, ts) => sum + (getSlot(ts).roles?.[role] || 0),
                          0,
                        );
                        return (
                          <div
                            key={role}
                            className="flex flex-col justify-between rounded-xl border border-border bg-background p-4 shadow-xs transition hover:border-primary/40 hover:bg-surface"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                  <Briefcase className="h-3.5 w-3.5" />
                                </div>
                                <h4
                                  className="truncate font-heading text-sm font-semibold text-text"
                                  title={role}
                                >
                                  {role}
                                </h4>
                              </div>
                              <Badge variant="outline" className="shrink-0 text-[11px]">
                                {roleTotal}
                              </Badge>
                            </div>
                            <div className="mt-3 grid grid-cols-3 divide-x divide-border/60 rounded-lg border border-border/60 bg-surface py-2">
                              {TIME_SLOTS.map((ts) => (
                                <div
                                  key={ts}
                                  className="flex flex-col items-center px-1 text-center"
                                >
                                  <span className="text-[10px] font-medium text-muted">{ts}</span>
                                  <span className="font-heading text-base font-bold text-text">
                                    {getSlot(ts).roles?.[role] || 0}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              </div>
            );
          })()
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
