import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SundayDateTimePicker } from '../SundayDateTimePicker';
import {
  formatTime12Hour,
  parse12HourTimeString,
  parseDateTimeParts,
  split24HourTime,
} from '../sundayDateTimeUtils';

describe('SundayDateTimePicker & Utils', () => {
  describe('Helper functions', () => {
    it('formats 24h times to 12h format correctly', () => {
      expect(formatTime12Hour('07:00')).toBe('7:00 AM');
      expect(formatTime12Hour('09:00')).toBe('9:00 AM');
      expect(formatTime12Hour('09:30')).toBe('9:30 AM');
      expect(formatTime12Hour('12:00')).toBe('12:00 PM');
      expect(formatTime12Hour('13:52')).toBe('1:52 PM');
      expect(formatTime12Hour('15:00')).toBe('3:00 PM');
      expect(formatTime12Hour('')).toBe('');
    });

    it('splits 24h time into time string and period', () => {
      expect(split24HourTime('13:52')).toEqual({ timeStr: '1:52', period: 'PM' });
      expect(split24HourTime('09:00')).toEqual({ timeStr: '9:00', period: 'AM' });
      expect(split24HourTime('12:00')).toEqual({ timeStr: '12:00', period: 'PM' });
      expect(split24HourTime('00:30')).toEqual({ timeStr: '12:30', period: 'AM' });
    });

    it('parses arbitrary 12-hour time strings correctly', () => {
      // User request example: 1:52 PM
      expect(parse12HourTimeString('1:52 PM')).toEqual({
        timeStr: '1:52',
        period: 'PM',
        time24: '13:52',
      });
      expect(parse12HourTimeString('1:52pm')).toEqual({
        timeStr: '1:52',
        period: 'PM',
        time24: '13:52',
      });
      expect(parse12HourTimeString('1:52', 'PM')).toEqual({
        timeStr: '1:52',
        period: 'PM',
        time24: '13:52',
      });
      expect(parse12HourTimeString('1:52', 'AM')).toEqual({
        timeStr: '1:52',
        period: 'AM',
        time24: '01:52',
      });
      expect(parse12HourTimeString('9')).toEqual({
        timeStr: '9:00',
        period: 'AM',
        time24: '09:00',
      });
      expect(parse12HourTimeString('13:52')).toEqual({
        timeStr: '1:52',
        period: 'PM',
        time24: '13:52',
      });
      expect(parse12HourTimeString('invalid')).toBeNull();
    });

    it('parses datetime values into date and time parts', () => {
      expect(parseDateTimeParts('2026-11-08T13:52')).toEqual({
        datePart: '2026-11-08',
        timePart: '13:52',
      });
      expect(parseDateTimeParts('2026-11-08')).toEqual({
        datePart: '2026-11-08',
        timePart: '09:00',
      });
      expect(parseDateTimeParts('')).toEqual({
        datePart: '',
        timePart: '09:00',
      });
    });
  });

  describe('Component rendering & interaction', () => {
    it('renders label, Sunday trigger, and 12-hour time input with AM/PM toggle', () => {
      render(
        <SundayDateTimePicker
          id="test-session"
          label="Session Date & Time"
          required
          value=""
          onChange={vi.fn()}
        />,
      );

      expect(screen.getByText('Session Date & Time')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByText('Select Sunday date')).toBeInTheDocument();

      const timeInput = screen.getByRole('textbox', { name: /session time/i });
      expect(timeInput).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'AM' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'PM' })).toBeInTheDocument();
    });

    it('allows typing a specific custom time like 1:52 PM', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <SundayDateTimePicker id="test-session" value="2026-11-08T09:00" onChange={onChange} />,
      );

      const timeInput = screen.getByRole('textbox', { name: /session time/i });
      await user.clear(timeInput);
      await user.type(timeInput, '1:52');

      // Click PM button
      const pmButton = screen.getByRole('button', { name: 'PM' });
      await user.click(pmButton);

      expect(onChange).toHaveBeenCalledWith('2026-11-08T13:52');
    });

    it('auto-switches to PM when user types 1:52 PM directly in the input', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <SundayDateTimePicker id="test-session" value="2026-11-08T09:00" onChange={onChange} />,
      );

      const timeInput = screen.getByRole('textbox', { name: /session time/i });
      await user.clear(timeInput);
      await user.type(timeInput, '1:52 PM');

      expect(onChange).toHaveBeenCalledWith('2026-11-08T13:52');
    });

    it('renders disabled/read-only view with formatted text', () => {
      render(
        <SundayDateTimePicker
          id="test-session"
          label="Session Date & Time"
          disabled
          value="2026-11-08T13:52"
          onChange={vi.fn()}
        />,
      );

      expect(screen.getByText(/Nov 8, 2026 · 1:52 PM/i)).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: /session time/i })).not.toBeInTheDocument();
    });

    it('renders fallback text when disabled and value is empty', () => {
      render(
        <SundayDateTimePicker
          id="test-session"
          label="Session Date & Time"
          disabled
          value=""
          onChange={vi.fn()}
        />,
      );

      expect(screen.getByText('No session date recorded')).toBeInTheDocument();
    });

    it('renders error and helperText correctly', () => {
      const { rerender } = render(
        <SundayDateTimePicker
          id="test-session"
          value=""
          onChange={vi.fn()}
          helperText="Please select an upcoming Sunday"
        />,
      );

      expect(screen.getByText('Please select an upcoming Sunday')).toBeInTheDocument();

      rerender(
        <SundayDateTimePicker
          id="test-session"
          value=""
          onChange={vi.fn()}
          error="Date and time is required"
          helperText="Please select an upcoming Sunday"
        />,
      );

      expect(screen.getByText('Date and time is required')).toBeInTheDocument();
      expect(screen.queryByText('Please select an upcoming Sunday')).not.toBeInTheDocument();
    });
  });
});
