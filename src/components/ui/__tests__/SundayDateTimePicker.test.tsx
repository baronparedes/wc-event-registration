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
    it('renders as a single unified trigger button matching the form field', () => {
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

      // Trigger button with placeholder
      const trigger = screen.getByRole('button', { name: /select sunday date & time/i });
      expect(trigger).toBeInTheDocument();

      // Popover is initially closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens popover on click and allows picking service time presets and custom time', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <SundayDateTimePicker id="test-session" value="2026-11-08T09:00" onChange={onChange} />,
      );

      // Trigger button displays current formatted datetime
      const trigger = screen.getByRole('button', { name: /Nov 8, 2026 · 9:00 AM/i });
      expect(trigger).toBeInTheDocument();

      // Click trigger to open unified popover
      await user.click(trigger);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Service presets exist
      const preset12 = screen.getByRole('button', { name: '12 NN' });
      await user.click(preset12);
      expect(onChange).toHaveBeenCalledWith('2026-11-08T12:00');

      // Custom time input: type 1:52 PM
      const timeInput = screen.getByRole('textbox', { name: /session time/i });
      await user.clear(timeInput);
      await user.type(timeInput, '1:52 PM');
      expect(onChange).toHaveBeenCalledWith('2026-11-08T13:52');

      // Click Done closes popover
      const doneButton = screen.getByRole('button', { name: 'Done' });
      await user.click(doneButton);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('disables session time controls when a Sunday date is not yet picked', async () => {
      const user = userEvent.setup();
      render(<SundayDateTimePicker id="test-session" value="" onChange={vi.fn()} />);

      // Open popover
      const trigger = screen.getByRole('button', { name: /select sunday date & time/i });
      await user.click(trigger);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Session time textbox is disabled
      const timeInput = screen.getByRole('textbox', { name: /session time/i });
      expect(timeInput).toBeDisabled();

      // Preset buttons and AM/PM buttons are disabled
      expect(screen.getByRole('button', { name: '9 AM' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '12 NN' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '3 PM' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'AM' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'PM' })).toBeDisabled();
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
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
