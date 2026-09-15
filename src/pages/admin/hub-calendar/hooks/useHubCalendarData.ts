import { useMemo } from 'react';

import {
  type MemberScheduleEntry,
  type TimeSlot,
  useGetExcusedMembers,
} from '@/hooks/domain/members';
import {
  type MilestoneEntry,
  buildCalendarCells,
  buildMilestoneEntries,
  buildMobileWeekCells,
  getMonthDayKeyFromMember,
  getMonthWeekRanges,
  toMonthDayKey,
} from '@/lib/domain/hub-calendar';
import { type AdminMember } from '@/lib/domain/members';

export function useHubCalendarData(
  scheduleEntries: MemberScheduleEntry[],
  members: AdminMember[],
  viewYear: number,
  viewMonthIndex: number,
  selectedDayNumber: number,
) {
  const { data: excusedMembersArray = [] } = useGetExcusedMembers(viewYear, viewMonthIndex);

  const excusedMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const record of excusedMembersArray) {
      if (!record.requestDate) continue;
      const cleanDate = record.requestDate.trim().split('T')[0];
      const parts = cleanDate.split('-');
      if (parts.length >= 3) {
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        if (!isNaN(month) && !isNaN(day)) {
          const key = toMonthDayKey(month, day);

          if (!map.has(key)) {
            map.set(key, new Set());
          }
          const set = map.get(key)!;
          if (record.userId) {
            set.add(record.userId);
            set.add(record.userId.toLowerCase());
          }
          if (record.memberId) {
            const trimmed = record.memberId.trim();
            set.add(trimmed);
            set.add(trimmed.toLowerCase());
          }
        }
      }
    }
    return map;
  }, [excusedMembersArray]);

  const calendarCells = useMemo(() => {
    return buildCalendarCells(viewYear, viewMonthIndex);
  }, [viewYear, viewMonthIndex]);

  const daysInMonth = new Date(viewYear, viewMonthIndex + 1, 0).getDate();

  const scheduleMap = useMemo(() => {
    const map = new Map<string, MemberScheduleEntry[]>();
    for (const cell of calendarCells) {
      if (cell.isCurrentMonth && cell.isSunday && cell.sundayKey) {
        const matchingEntries = scheduleEntries.filter(
          (entry) => entry.sundayKey === cell.sundayKey,
        );
        map.set(cell.monthDayKey!, matchingEntries);
      }
    }
    return map;
  }, [scheduleEntries, calendarCells]);

  const milestoneEntries = useMemo(() => buildMilestoneEntries(members), [members]);

  const milestoneMap = useMemo(() => {
    const grouped = new Map<string, MilestoneEntry[]>();
    for (const entry of milestoneEntries) {
      const key = getMonthDayKeyFromMember(entry.member, entry.type);
      if (!key) continue;

      const existing = grouped.get(key) ?? [];
      existing.push(entry);
      grouped.set(key, existing);
    }
    return grouped;
  }, [milestoneEntries]);

  const currentMonthMilestoneEntries = useMemo(() => {
    return milestoneEntries.filter((entry) => {
      const key = getMonthDayKeyFromMember(entry.member, entry.type);
      if (!key) return false;
      const [month] = key.split('-').map(Number);
      return month === viewMonthIndex + 1;
    });
  }, [milestoneEntries, viewMonthIndex]);

  const birthdayCount = useMemo(
    () => currentMonthMilestoneEntries.filter((e) => e.type === 'birthday').length,
    [currentMonthMilestoneEntries],
  );

  const anniversaryCount = useMemo(
    () => currentMonthMilestoneEntries.filter((e) => e.type === 'wedding_anniversary').length,
    [currentMonthMilestoneEntries],
  );

  const selectedMonthDayKey = toMonthDayKey(
    viewMonthIndex + 1,
    Math.min(selectedDayNumber, daysInMonth),
  );

  const selectedEntries = useMemo(
    () => scheduleMap.get(selectedMonthDayKey) ?? [],
    [scheduleMap, selectedMonthDayKey],
  );
  const selectedMilestones = useMemo(
    () => milestoneMap.get(selectedMonthDayKey) ?? [],
    [milestoneMap, selectedMonthDayKey],
  );

  const isCurrentSelectedSunday = calendarCells.some(
    (c) => c.dayNumber === selectedDayNumber && c.isSunday,
  );

  const entriesByTimeSlot = useMemo(() => {
    const grouped: Record<TimeSlot, MemberScheduleEntry[]> = {
      '9AM': [],
      '12NN': [],
      '3PM': [],
    };
    for (const entry of selectedEntries) {
      for (const slot of entry.timeSlots) {
        grouped[slot].push(entry);
      }
    }
    return grouped;
  }, [selectedEntries]);

  const monthWeeks = useMemo(
    () => getMonthWeekRanges(viewYear, viewMonthIndex),
    [viewYear, viewMonthIndex],
  );

  const currentWeekNumber = useMemo(() => {
    const matchingWeek = monthWeeks.find((w) =>
      w.days.some(
        (d) =>
          d.getFullYear() === viewYear &&
          d.getMonth() === viewMonthIndex &&
          d.getDate() === selectedDayNumber,
      ),
    );
    return matchingWeek ? matchingWeek.weekNumber : 1;
  }, [monthWeeks, viewYear, viewMonthIndex, selectedDayNumber]);

  const weekOptions = useMemo(() => {
    return monthWeeks.map((week) => ({
      weekNumber: week.weekNumber,
      isAvailable: true,
    }));
  }, [monthWeeks]);

  const activeWeek = monthWeeks.find((w) => w.weekNumber === currentWeekNumber) ?? monthWeeks[0];

  const mobileWeekCells = useMemo(() => {
    if (!activeWeek) return [];
    return buildMobileWeekCells(activeWeek, viewYear, viewMonthIndex, scheduleMap, milestoneMap);
  }, [activeWeek, viewYear, viewMonthIndex, scheduleMap, milestoneMap]);

  return {
    calendarCells,
    scheduleMap,
    excusedMap,
    milestoneEntries,
    milestoneMap,
    currentMonthMilestoneEntries,
    birthdayCount,
    anniversaryCount,
    selectedEntries,
    selectedMilestones,
    isCurrentSelectedSunday,
    entriesByTimeSlot,
    monthWeeks,
    currentWeekNumber,
    weekOptions,
    mobileWeekCells,
  };
}
