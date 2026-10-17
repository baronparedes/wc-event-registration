import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SundayCalendarPicker } from '../components/SundayCalendarPicker';
import {
  formatDateOnly,
  formatSundayDisplay,
  getNearestUpcomingSundayString,
  parseDateOnly,
} from '../utils';

const mockDayPicker = vi.fn();

vi.mock('react-day-picker', () => ({
  DayPicker: (props: unknown) => {
    mockDayPicker(props);
    const typedProps = props as {
      onSelect?: (date?: Date) => void;
      disabled?: Array<{ before: Date } | { after: Date } | ((date: Date) => boolean)>;
    };
    return (
      <div data-testid="mock-day-picker">
        <button type="button" onClick={() => typedProps.onSelect?.(new Date(2026, 9, 25))}>
          Pick Oct 25
        </button>
      </div>
    );
  },
}));

vi.mock('react-day-picker/style.css', () => ({}));

describe('SundayCalendarPicker Component & Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Helper Functions', () => {
    it('parseDateOnly parses YYYY-MM-DD correctly', () => {
      const parsed = parseDateOnly('2026-10-18');
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getFullYear()).toBe(2026);
      expect(parsed?.getMonth()).toBe(9); // 0-indexed October
      expect(parsed?.getDate()).toBe(18);
    });

    it('parseDateOnly returns undefined for invalid formats and rolling dates', () => {
      expect(parseDateOnly('')).toBeUndefined();
      expect(parseDateOnly('invalid')).toBeUndefined();
      expect(parseDateOnly('2026-99-99')).toBeUndefined();
      expect(parseDateOnly('2026-02-31')).toBeUndefined();
    });

    it('formatDateOnly formats date to YYYY-MM-DD', () => {
      const date = new Date(2026, 9, 18);
      expect(formatDateOnly(date)).toBe('2026-10-18');
    });

    it('formatSundayDisplay formats date nicely for display', () => {
      expect(formatSundayDisplay('2026-10-18')).toContain('Sun');
      expect(formatSundayDisplay('2026-10-18')).toContain('Oct 18, 2026');
      expect(formatSundayDisplay(undefined)).toBe('Select Sunday date');
    });

    it('getNearestUpcomingSundayString returns a Sunday string', () => {
      const sundayStr = getNearestUpcomingSundayString();
      expect(sundayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const parsed = parseDateOnly(sundayStr);
      expect(parsed?.getDay()).toBe(0);
    });
  });

  describe('SundayCalendarPicker Rendering & Interaction', () => {
    it('renders the picker trigger button with formatted date', () => {
      const handleChange = vi.fn();
      render(
        <SundayCalendarPicker
          value="2026-10-18"
          onChange={handleChange}
          maxPastDays={3}
          monthsInFuture={6}
          allowedWeekdays={[0]}
        />,
      );

      const button = screen.getByRole('button', { name: /Oct 18, 2026/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-haspopup', 'dialog');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens and closes popover dialog on click', () => {
      const handleChange = vi.fn();
      render(
        <SundayCalendarPicker
          value="2026-10-18"
          onChange={handleChange}
          maxPastDays={3}
          monthsInFuture={6}
          allowedWeekdays={[0]}
        />,
      );

      const button = screen.getByRole('button', { name: /Oct 18, 2026/i });
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click button again to close
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes popover on Escape key', () => {
      const handleChange = vi.fn();
      render(
        <SundayCalendarPicker
          value="2026-10-18"
          onChange={handleChange}
          maxPastDays={3}
          monthsInFuture={6}
          allowedWeekdays={[0]}
        />,
      );

      const button = screen.getByRole('button', { name: /Oct 18, 2026/i });
      fireEvent.click(button);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes popover when clicking outside', () => {
      const handleChange = vi.fn();
      render(
        <div>
          <button type="button">Outside Element</button>
          <SundayCalendarPicker
            value="2026-10-18"
            onChange={handleChange}
            maxPastDays={3}
            monthsInFuture={6}
            allowedWeekdays={[0]}
          />
        </div>,
      );

      const triggerButton = screen.getByRole('button', { name: /Oct 18, 2026/i });
      fireEvent.click(triggerButton);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside Element' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('selects an allowed date and calls onChange with formatted date', () => {
      const handleChange = vi.fn();
      render(
        <SundayCalendarPicker
          value="2026-10-18"
          onChange={handleChange}
          maxPastDays={3}
          monthsInFuture={6}
          allowedWeekdays={[0]}
        />,
      );

      const triggerButton = screen.getByRole('button', { name: /Oct 18, 2026/i });
      fireEvent.click(triggerButton);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const dayButton = screen.getByRole('button', { name: 'Pick Oct 25' });
      fireEvent.click(dayButton);

      expect(handleChange).toHaveBeenCalledWith('2026-10-25');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('applies custom calendar rules correctly (max_past_days: 3, allowed_weekdays: [0], max_days: 6 months)', () => {
      const handleChange = vi.fn();
      render(
        <SundayCalendarPicker
          value="2026-10-18"
          onChange={handleChange}
          maxPastDays={3}
          monthsInFuture={6}
          allowedWeekdays={[0]}
        />,
      );

      const triggerButton = screen.getByRole('button', { name: /Oct 18, 2026/i });
      fireEvent.click(triggerButton);

      expect(mockDayPicker).toHaveBeenCalledTimes(1);
      const props = mockDayPicker.mock.calls[0][0] as {
        disabled: Array<{ before?: Date; after?: Date } | ((date: Date) => boolean)>;
      };

      const disabledRules = props.disabled;
      expect(disabledRules).toHaveLength(3);

      // Rule 1: max_past_days: 3
      const pastRule = disabledRules[0] as { before: Date };
      expect(pastRule.before).toBeInstanceOf(Date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const expectedOldest = new Date(now);
      expectedOldest.setDate(expectedOldest.getDate() - 3);
      expect(pastRule.before.toDateString()).toBe(expectedOldest.toDateString());

      // Rule 2: max_days: 6 months from today
      const futureRule = disabledRules[1] as { after: Date };
      expect(futureRule.after).toBeInstanceOf(Date);
      const expectedFuture = new Date();
      expectedFuture.setMonth(expectedFuture.getMonth() + 6);
      expect(futureRule.after.getMonth()).toBe(expectedFuture.getMonth());

      // Rule 3: allowed_weekdays: [0] (Sundays only)
      const weekdayFn = disabledRules[2] as (date: Date) => boolean;
      expect(typeof weekdayFn).toBe('function');
      // Sunday (0) should NOT be disabled (returns false)
      const sunday = new Date(2026, 9, 18); // Oct 18, 2026 is Sunday
      expect(weekdayFn(sunday)).toBe(false);
      // Monday (1) SHOULD be disabled (returns true)
      const monday = new Date(2026, 9, 19);
      expect(weekdayFn(monday)).toBe(true);
      // Saturday (6) SHOULD be disabled (returns true)
      const saturday = new Date(2026, 9, 24);
      expect(weekdayFn(saturday)).toBe(true);
    });
  });
});
