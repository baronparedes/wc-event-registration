import { useEffect, useState } from 'react';

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

export function useHubCalendarState() {
  const [viewDate, setViewDate] = useState(() => {
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
    const stored = getStoredCalendarDate();
    if (stored) {
      return stored.dayNumber;
    }
    return today.getDate();
  });
  const [activeTab, setActiveTab] = useState<TimeSlot>('9AM');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    saveStoredCalendarDate({
      year: viewYear,
      monthIndex: viewMonthIndex,
      dayNumber: selectedDayNumber,
    });
  }, [viewYear, viewMonthIndex, selectedDayNumber]);

  function handleTabChange(slot: TimeSlot) {
    setActiveTab(slot);
    setSelectedRole(null);
    setSearchQuery('');
  }

  const minViewDate = new Date(today.getFullYear() - 1, today.getMonth(), 1);
  const maxViewDate = new Date(today.getFullYear() + 2, today.getMonth(), 1);

  const isAtMinimumMonth = viewYear === minViewDate.getFullYear() && viewMonthIndex === 0;
  const isAtMaximumMonth =
    viewYear === maxViewDate.getFullYear() && viewMonthIndex === maxViewDate.getMonth();
  const isAtToday =
    viewYear === today.getFullYear() &&
    viewMonthIndex === today.getMonth() &&
    selectedDayNumber === today.getDate();

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
