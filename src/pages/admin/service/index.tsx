import { useMemo, useState } from 'react';

import { format, getDay } from 'date-fns';
import {
  Briefcase,
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
import { Badge, Button, EmptyState, FormSelectField, SectionCard } from '@/components/ui';
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
const TIME_SLOTS = ['9AM', '12NN', '3PM'] as const;

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

  const monthOptions = useMemo(
    () =>
      MONTHS.map((m, i) => ({
        value: (i + 1).toString(),
        label: m,
      })),
    [],
  );

  const yearOptions = useMemo(
    () =>
      YEARS.map((y) => ({
        value: y.toString(),
        label: y.toString(),
      })),
    [],
  );

  const sundayOptions = useMemo(
    () =>
      sundaysInMonth.map((d) => ({
        value: d,
        label: format(new Date(d), 'EEEE, MMM d, yyyy'),
      })),
    [sundaysInMonth],
  );

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
          <Button
            variant="outline"
            onClick={() => navigate(ROUTE_PATHS.adminServiceAttendanceMigration)}
          >
            <Download className="mr-2 h-4 w-4" />
            Import Records
          </Button>
        }
      />
      <AdminBaseNavigation />
      <AdminPageShell.Content className="mt-6 space-y-6">
        {/* Filter Controls Card */}
        <SectionCard wrapperClassName="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Filter By
              </span>
              <div className="inline-flex rounded-full border border-border bg-background p-1">
                <Button
                  type="button"
                  size="xs"
                  variant={filterType === 'month' ? 'default' : 'ghost'}
                  className="rounded-full shadow-none"
                  onClick={() => setFilterType('month')}
                >
                  Month & Year
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant={filterType === 'sunday' ? 'default' : 'ghost'}
                  className="rounded-full shadow-none"
                  onClick={() => setFilterType('sunday')}
                >
                  Specific Sunday
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filterType === 'month' ? (
                <>
                  <div className="w-36">
                    <FormSelectField
                      ariaLabel="Select month"
                      value={selectedMonth.toString()}
                      onChange={(val) => setSelectedMonth(parseInt(val))}
                      options={monthOptions}
                    />
                  </div>
                  <div className="w-28">
                    <FormSelectField
                      ariaLabel="Select year"
                      value={selectedYear.toString()}
                      onChange={(val) => setSelectedYear(parseInt(val))}
                      options={yearOptions}
                    />
                  </div>
                </>
              ) : (
                <div className="w-60">
                  <FormSelectField
                    ariaLabel="Select Sunday"
                    value={selectedSunday}
                    onChange={setSelectedSunday}
                    options={sundayOptions}
                  />
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
                  <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Handshake className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-heading font-semibold text-text">Committed</h3>
                          <p className="text-xs text-muted">Expected volunteers</p>
                        </div>
                      </div>
                      <Badge variant="default">{totalCommitted} Total</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((ts) => (
                        <div
                          key={ts}
                          className="flex h-[104px] flex-col items-center justify-between rounded-xl border border-border/50 bg-background p-3 text-center"
                        >
                          <span className="text-xs font-medium text-muted">{ts}</span>
                          <span className="font-heading text-2xl font-bold text-text">
                            {getSlot(ts).committed}
                          </span>
                          <span
                            className="invisible select-none text-[10px] text-muted"
                            aria-hidden="true"
                          >
                            -
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Present */}
                  <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                          <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-heading font-semibold text-text">Present</h3>
                          <p className="text-xs text-muted">Scheduled turn-up</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{totalPresent} Total</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((ts) => {
                        const slot = getSlot(ts);
                        return (
                          <div
                            key={ts}
                            className="flex h-[104px] flex-col items-center justify-between rounded-xl border border-border/50 bg-background p-3 text-center"
                          >
                            <span className="text-xs font-medium text-muted">{ts}</span>
                            <span className="font-heading text-2xl font-bold text-text">
                              {slot.present}
                            </span>
                            {slot.walk_ins > 0 ? (
                              <span className="inline-flex items-center rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                                +{slot.walk_ins} walk-in
                              </span>
                            ) : (
                              <span
                                className="invisible select-none text-[10px] text-muted"
                                aria-hidden="true"
                              >
                                -
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Turn-up % */}
                  <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-text">
                          <Percent className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-heading font-semibold text-text">Turn-Up Rate</h3>
                          <p className="text-xs text-muted">Attended vs Committed</p>
                        </div>
                      </div>
                      <Badge variant={overallTurnup < 50 ? 'destructive' : 'default'}>
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
                            className={`flex h-[104px] flex-col items-center justify-between rounded-xl border p-3 text-center transition-colors ${
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
                            <span className="text-[10px] text-muted">
                              {slot.present}/{slot.committed}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Secondary Exceptions: Late/Tardy & Total Walk-Ins */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Late / Tardy */}
                  <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-text">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-heading font-semibold text-text">Late / Tardy</h3>
                          <p className="text-xs text-muted">Override check-ins</p>
                        </div>
                      </div>
                      <Badge variant="accent">{totalLateTardy} Total</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((ts) => (
                        <div
                          key={ts}
                          className="flex h-[104px] flex-col items-center justify-between rounded-xl border border-border/50 bg-background p-3 text-center"
                        >
                          <span className="text-xs font-medium text-muted">{ts}</span>
                          <span className="font-heading text-2xl font-bold text-text">
                            {getSlot(ts).late_tardy}
                          </span>
                          <span
                            className="invisible select-none text-[10px] text-muted"
                            aria-hidden="true"
                          >
                            -
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Walk-In */}
                  <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-heading font-semibold text-text">Total Walk-In</h3>
                          <p className="text-xs text-muted">Uncommitted attendees</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{totalWalkIns} Total</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((ts) => (
                        <div
                          key={ts}
                          className="flex h-[104px] flex-col items-center justify-between rounded-xl border border-border/50 bg-background p-3 text-center"
                        >
                          <span className="text-xs font-medium text-muted">{ts}</span>
                          <span className="font-heading text-2xl font-bold text-text">
                            {getSlot(ts).walk_ins}
                          </span>
                          <span
                            className="invisible select-none text-[10px] text-muted"
                            aria-hidden="true"
                          >
                            -
                          </span>
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
