import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  HUB_CALENDAR_SELECTED_DATE_STORAGE_KEY,
  getStoredCalendarDate,
  saveStoredCalendarDate,
  useHubCalendarState,
} from '../hooks/useHubCalendarState';

describe('useHubCalendarState & persistence helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('getStoredCalendarDate & saveStoredCalendarDate', () => {
    it('returns null when storage is empty', () => {
      expect(getStoredCalendarDate()).toBeNull();
    });

    it('returns null on invalid JSON in sessionStorage', () => {
      sessionStorage.setItem(HUB_CALENDAR_SELECTED_DATE_STORAGE_KEY, 'invalid-json');
      expect(getStoredCalendarDate()).toBeNull();
    });

    it('returns null on invalid date values (e.g. non-existent calendar date)', () => {
      // February 31st does not exist
      sessionStorage.setItem(
        HUB_CALENDAR_SELECTED_DATE_STORAGE_KEY,
        JSON.stringify({ year: 2026, monthIndex: 1, dayNumber: 31 }),
      );
      expect(getStoredCalendarDate()).toBeNull();
    });

    it('returns null on out-of-range month index', () => {
      sessionStorage.setItem(
        HUB_CALENDAR_SELECTED_DATE_STORAGE_KEY,
        JSON.stringify({ year: 2026, monthIndex: 12, dayNumber: 1 }),
      );
      expect(getStoredCalendarDate()).toBeNull();
    });

    it('saves and retrieves valid date purely from sessionStorage', () => {
      saveStoredCalendarDate({ year: 2026, monthIndex: 7, dayNumber: 15 });
      expect(getStoredCalendarDate()).toEqual({
        year: 2026,
        monthIndex: 7,
        dayNumber: 15,
      });
      expect(sessionStorage.getItem(HUB_CALENDAR_SELECTED_DATE_STORAGE_KEY)).toBe(
        JSON.stringify({ year: 2026, monthIndex: 7, dayNumber: 15 }),
      );
      expect(localStorage.getItem(HUB_CALENDAR_SELECTED_DATE_STORAGE_KEY)).toBeNull();
    });

    it('ignores localStorage completely', () => {
      localStorage.setItem(
        HUB_CALENDAR_SELECTED_DATE_STORAGE_KEY,
        JSON.stringify({ year: 2024, monthIndex: 0, dayNumber: 1 }),
      );
      expect(getStoredCalendarDate()).toBeNull();
    });
  });

  describe('useHubCalendarState hook', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    );

    it('initializes to today when storage is empty and persists to storage', () => {
      const today = new Date();
      const { result } = renderHook(() => useHubCalendarState(), { wrapper });

      expect(result.current.viewYear).toBe(today.getFullYear());
      expect(result.current.viewMonthIndex).toBe(today.getMonth());
      expect(result.current.selectedDayNumber).toBe(today.getDate());

      // Saved via useEffect
      expect(getStoredCalendarDate()).toEqual({
        year: today.getFullYear(),
        monthIndex: today.getMonth(),
        dayNumber: today.getDate(),
      });
    });

    it('initializes from stored date if present in storage', () => {
      saveStoredCalendarDate({ year: 2025, monthIndex: 5, dayNumber: 20 });

      const { result } = renderHook(() => useHubCalendarState(), { wrapper });

      expect(result.current.viewYear).toBe(2025);
      expect(result.current.viewMonthIndex).toBe(5);
      expect(result.current.selectedDayNumber).toBe(20);
    });

    it('updates storage when selecting a day', () => {
      saveStoredCalendarDate({ year: 2026, monthIndex: 3, dayNumber: 5 });
      const { result } = renderHook(() => useHubCalendarState(), { wrapper });

      act(() => {
        result.current.handleSelectDay(18);
      });

      expect(result.current.selectedDayNumber).toBe(18);
      expect(getStoredCalendarDate()).toEqual({
        year: 2026,
        monthIndex: 3,
        dayNumber: 18,
      });
    });

    it('updates storage when selecting a day with another month date', () => {
      saveStoredCalendarDate({ year: 2026, monthIndex: 3, dayNumber: 5 });
      const { result } = renderHook(() => useHubCalendarState(), { wrapper });

      const nextMonthDate = new Date(2026, 4, 2);
      act(() => {
        result.current.handleSelectDay(2, nextMonthDate);
      });

      expect(result.current.viewYear).toBe(2026);
      expect(result.current.viewMonthIndex).toBe(4);
      expect(result.current.selectedDayNumber).toBe(2);
      expect(getStoredCalendarDate()).toEqual({
        year: 2026,
        monthIndex: 4,
        dayNumber: 2,
      });
    });

    it('updates storage when navigating months', () => {
      saveStoredCalendarDate({ year: 2026, monthIndex: 3, dayNumber: 15 });
      const { result } = renderHook(() => useHubCalendarState(), { wrapper });

      act(() => {
        result.current.handleNextMonth();
      });

      expect(result.current.viewYear).toBe(2026);
      expect(result.current.viewMonthIndex).toBe(4);
      expect(result.current.selectedDayNumber).toBe(1);
      expect(getStoredCalendarDate()).toEqual({
        year: 2026,
        monthIndex: 4,
        dayNumber: 1,
      });

      act(() => {
        result.current.handlePreviousMonth();
      });

      expect(result.current.viewYear).toBe(2026);
      expect(result.current.viewMonthIndex).toBe(3);
      expect(result.current.selectedDayNumber).toBe(1);
      expect(getStoredCalendarDate()).toEqual({
        year: 2026,
        monthIndex: 3,
        dayNumber: 1,
      });
    });

    it('updates storage when clicking handleToday', () => {
      const today = new Date();
      saveStoredCalendarDate({ year: 2025, monthIndex: 0, dayNumber: 1 });
      const { result } = renderHook(() => useHubCalendarState(), { wrapper });

      act(() => {
        result.current.handleToday();
      });

      expect(result.current.viewYear).toBe(today.getFullYear());
      expect(result.current.viewMonthIndex).toBe(today.getMonth());
      expect(result.current.selectedDayNumber).toBe(today.getDate());
      expect(getStoredCalendarDate()).toEqual({
        year: today.getFullYear(),
        monthIndex: today.getMonth(),
        dayNumber: today.getDate(),
      });
    });
  });
});
