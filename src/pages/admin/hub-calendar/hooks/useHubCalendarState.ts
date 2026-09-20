import { useEffect, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import type { TimeSlot } from '@/hooks/domain/members';
import type { WeekRange } from '@/lib/domain/hub-calendar';

export const HUB_CALENDAR_SELECTED_DATE_STORAGE_KEY = 'wc:hub-calendar:selected-date';

export interface StoredCalendarDate {
  year: number;
  monthIndex: number;
  dayNumber: number;
}

export function getStoredCalendarDate(): StoredCalendarDate | null {
  try {
    const raw =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(HUB_CALENDAR_SELECTED_DATE_STORAGE_KEY)
        : null;

    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.year === 'number' &&
      Number.isInteger(parsed.year) &&
      typeof parsed?.monthIndex === 'number' &&
      Number.isInteger(parsed.monthIndex) &&
      parsed.monthIndex >= 0 &&
      parsed.monthIndex <= 11 &&
      typeof parsed?.dayNumber === 'number' &&
      Number.isInteger(parsed.dayNumber) &&
      parsed.dayNumber >= 1 &&
      parsed.dayNumber <= 31
    ) {
      const testDate = new Date(parsed.year, parsed.monthIndex, parsed.dayNumber);
      if (
        testDate.getFullYear() === parsed.year &&
        testDate.getMonth() === parsed.monthIndex &&
        testDate.getDate() === parsed.dayNumber
      ) {
        return {
          year: parsed.year,
          monthIndex: parsed.monthIndex,
          dayNumber: parsed.dayNumber,
        };
      }
    }
  } catch {
    // Ignore storage parse or access errors
  }
  return null;
}

export function saveStoredCalendarDate(date: StoredCalendarDate): void {
  try {
    const serialized = JSON.stringify(date);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(HUB_CALENDAR_SELECTED_DATE_STORAGE_KEY, serialized);
    }
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}

function parseQueryDate(dateStr: string | null): StoredCalendarDate | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const dayNumber = parseInt(dayStr, 10);

  const testDate = new Date(year, monthIndex, dayNumber);
  if (
    testDate.getFullYear() === year &&
    testDate.getMonth() === monthIndex &&
    testDate.getDate() === dayNumber
  ) {
    return { year, monthIndex, dayNumber };
  }
  return null;
}

export function useHubCalendarState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewDate, setViewDate] = useState(() => {
    const queryDate = parseQueryDate(searchParams.get('date'));
    if (queryDate) {
      return new Date(queryDate.year, queryDate.monthIndex, 1);
    }
    const stored = getStoredCalendarDate();
    if (stored) {
      return new Date(stored.year, stored.monthIndex, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = new Date();
  const viewYear = viewDate.getFullYear();
  const viewMonthIndex = viewDate.getMonth();

  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(() => {
    const queryDate = parseQueryDate(searchParams.get('date'));
    if (queryDate) {
      return queryDate.dayNumber;
    }
    const stored = getStoredCalendarDate();
    if (stored) {
      return stored.dayNumber;
    }
    return today.getDate();
  });
  const [activeTab, setActiveTab] = useState<TimeSlot>('9AM');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const minViewDate = new Date(today.getFullYear() - 1, today.getMonth(), 1);
  const maxViewDate = new Date(today.getFullYear() + 2, today.getMonth(), 1);

  const isAtMinimumMonth = viewYear === minViewDate.getFullYear() && viewMonthIndex === 0;
  const isAtMaximumMonth =
    viewYear === maxViewDate.getFullYear() && viewMonthIndex === maxViewDate.getMonth();
  const isAtToday =
    viewYear === today.getFullYear() &&
    viewMonthIndex === today.getMonth() &&
    selectedDayNumber === today.getDate();

  useEffect(() => {
    saveStoredCalendarDate({
      year: viewYear,
      monthIndex: viewMonthIndex,
      dayNumber: selectedDayNumber,
    });

    const monthStr = String(viewMonthIndex + 1).padStart(2, '0');
    const dayStr = String(selectedDayNumber).padStart(2, '0');
    const newDateStr = `${viewYear}-${monthStr}-${dayStr}`;

    setSearchParams(
      (prev) => {
        if (isAtToday) {
          if (!prev.has('date')) return prev;
          const next = new URLSearchParams(prev);
          next.delete('date');
          return next;
        }

        if (prev.get('date') === newDateStr) return prev;
        const next = new URLSearchParams(prev);
        next.set('date', newDateStr);
        return next;
      },
      { replace: true },
    );
  }, [viewYear, viewMonthIndex, selectedDayNumber, isAtToday, setSearchParams]);

  function handleTabChange(slot: TimeSlot) {
    setActiveTab(slot);
    setSelectedRole(null);
    setSearchQuery('');
  }

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

  function handleSelectWeek(weekNumber: number, monthWeeks: WeekRange[]) {
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
    if (typeof window !== 'undefined' && window.location.hash) {
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }

  function handleSelectDay(dayNumber: number, date?: Date) {
    if (date && (date.getFullYear() !== viewYear || date.getMonth() !== viewMonthIndex)) {
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
      setSelectedDayNumber(date.getDate());
      return;
    }
    setSelectedDayNumber(dayNumber);
  }

  return {
    viewDate,
    viewYear,
    viewMonthIndex,
    selectedDayNumber,
    activeTab,
    selectedRole,
    searchQuery,
    isAtMinimumMonth,
    isAtMaximumMonth,
    isAtToday,
    setSelectedRole,
    setSearchQuery,
    handleTabChange,
    handlePreviousMonth,
    handleNextMonth,
    handleSelectWeek,
    handleToday,
    handleSelectDay,
  };
}
