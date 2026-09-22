import { useMemo } from 'react';

import { addDays, format, parseISO, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button, FormSelectField, SectionCard, Tabs, TabsList, TabsTrigger } from '@/components/ui';

import { type FilterMode, MIN_YEAR, MONTHS } from '../constants';

interface ServiceDashboardFiltersProps {
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  selectedSunday: string;
  onSelectedSundayChange: (sunday: string) => void;
  selectedYear: number;
  onSelectedYearChange: (year: number) => void;
  selectedMonth: number;
  onSelectedMonthChange: (month: number) => void;
  maxSunday: string;
}

export function ServiceDashboardFilters({
  filterMode,
  onFilterModeChange,
  selectedSunday,
  onSelectedSundayChange,
  selectedYear,
  onSelectedYearChange,
  selectedMonth,
  onSelectedMonthChange,
  maxSunday,
}: ServiceDashboardFiltersProps) {
  const now = new Date();
  const currentYear = now.getFullYear();

  const minDateStr = `${MIN_YEAR}-01-01`;

  // Boundary conditions
  const canGoPrevSunday = format(subDays(parseISO(selectedSunday), 7), 'yyyy-MM-dd') >= minDateStr;
  const canGoNextSunday = selectedSunday < maxSunday;

  const canGoPrevMonth = !(selectedYear <= MIN_YEAR && selectedMonth <= 1);
  const canGoNextMonth = !(selectedYear >= currentYear && selectedMonth >= 12);

  const canGoPrevYear = selectedYear > MIN_YEAR;
  const canGoNextYear = selectedYear < currentYear;

  // Handlers for stepping forward/backward
  const handlePrevSunday = () => {
    const prev = subDays(parseISO(selectedSunday), 7);
    const prevStr = format(prev, 'yyyy-MM-dd');
    if (prevStr >= minDateStr) {
      onSelectedSundayChange(prevStr);
    }
  };

  const handleNextSunday = () => {
    const next = addDays(parseISO(selectedSunday), 7);
    const nextStr = format(next, 'yyyy-MM-dd');
    if (nextStr <= maxSunday) {
      onSelectedSundayChange(nextStr);
    }
  };

  const handlePrevMonth = () => {
    if (selectedYear <= MIN_YEAR && selectedMonth <= 1) return;
    if (selectedMonth === 1) {
      onSelectedMonthChange(12);
      onSelectedYearChange(selectedYear - 1);
    } else {
      onSelectedMonthChange(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedYear >= currentYear && selectedMonth >= 12) return;
    if (selectedMonth === 12) {
      onSelectedMonthChange(1);
      onSelectedYearChange(selectedYear + 1);
    } else {
      onSelectedMonthChange(selectedMonth + 1);
    }
  };

  const handlePrevYear = () => {
    if (selectedYear > MIN_YEAR) {
      onSelectedYearChange(selectedYear - 1);
    }
  };

  const handleNextYear = () => {
    if (selectedYear < currentYear) {
      onSelectedYearChange(selectedYear + 1);
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
    return MONTHS.map((m, i) => ({
      value: (i + 1).toString(),
      label: m,
    }));
  }, []);

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

  return (
    <SectionCard wrapperClassName="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Filter By
          </span>
          <Tabs
            value={filterMode}
            onValueChange={(val) => onFilterModeChange(val as FilterMode)}
            className="w-auto"
          >
            <TabsList containerClassName="w-auto justify-center" className="w-auto justify-center">
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
                  onChange={onSelectedSundayChange}
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
                title="Next Next Sunday"
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
                  onChange={(val) => onSelectedMonthChange(parseInt(val))}
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
                    onSelectedYearChange(nextYear);
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
                  onChange={(val) => onSelectedYearChange(parseInt(val))}
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
  );
}
