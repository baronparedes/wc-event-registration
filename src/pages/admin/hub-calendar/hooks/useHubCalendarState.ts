import { useState } from 'react';

import type { TimeSlot } from '@/hooks/domain/members';

import type { WeekRange } from '../utils/calendarUtils';

export function useHubCalendarState() {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = new Date();
  const viewYear = viewDate.getFullYear();
  const viewMonthIndex = viewDate.getMonth();

  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(today.getDate());
  const [activeTab, setActiveTab] = useState<TimeSlot>('9AM');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  function handleTabChange(slot: TimeSlot) {
    setActiveTab(slot);
    setSelectedRole(null);
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
  };
}
