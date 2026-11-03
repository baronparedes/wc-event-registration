import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SundayDateTimePicker } from '../SundayDateTimePicker';
import { formatTime12Hour, parseDateTimeParts } from '../sundayDateTimeUtils';

describe('SundayDateTimePicker', () => {
  describe('Helper functions', () => {
    it('formats 24h times to 12h format correctly', () => {
      expect(formatTime12Hour('07:00')).toBe('7:00 AM');
      expect(formatTime12Hour('09:00')).toBe('9:00 AM');
      expect(formatTime12Hour('09:30')).toBe('9:30 AM');
      expect(formatTime12Hour('12:00')).toBe('12:00 PM');
      expect(formatTime12Hour('12:30')).toBe('12:30 PM');
      expect(formatTime12Hour('13:00')).toBe('1:00 PM');
      expect(formatTime12Hour('15:00')).toBe('3:00 PM');
      expect(formatTime12Hour('18:30')).toBe('6:30 PM');
      expect(formatTime12Hour('')).toBe('');
    });

    it('parses datetime values into date and time parts', () => {
      expect(parseDateTimeParts('2026-11-08T09:00')).toEqual({
        datePart: '2026-11-08',
        timePart: '09:00',
      });
      expect(parseDateTimeParts('2026-11-08T15:30:00+08:00')).toEqual({
        datePart: '2026-11-08',
        timePart: '15:30',
      });
      expect(parseDateTimeParts('2026-11-08')).toEqual({
        datePart: '2026-11-08',
        timePart: '09:00',
      });
      expect(parseDateTimeParts('')).toEqual({
        datePart: '',
        timePart: '09:00',
      });
      expect(parseDateTimeParts(undefined)).toEqual({
        datePart: '',
        timePart: '09:00',
      });
    });
  });

  describe('Component rendering & interaction', () => {
    it('renders label, Sunday trigger, and 12-hour time selector', () => {
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

      const timeSelect = screen.getByRole('combobox', { name: /session time/i });
      expect(timeSelect).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '9:00 AM' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '12:00 PM' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '3:00 PM' })).toBeInTheDocument();
    });

    it('renders disabled/read-only view with formatted text', () => {
      render(
        <SundayDateTimePicker
          id="test-session"
          label="Session Date & Time"
          disabled
          value="2026-11-08T09:00"
          onChange={vi.fn()}
        />,
      );

      expect(screen.getByText(/Nov 8, 2026 · 9:00 AM/i)).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: /session time/i })).not.toBeInTheDocument();
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

    it('updates datetime when time selection changes', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <SundayDateTimePicker id="test-session" value="2026-11-08T09:00" onChange={onChange} />,
      );

      const timeSelect = screen.getByRole('combobox', { name: /session time/i });
      await user.selectOptions(timeSelect, '12:00');

      expect(onChange).toHaveBeenCalledWith('2026-11-08T12:00');
    });

    it('includes custom non-standard time slot in options', () => {
      render(
        <SundayDateTimePicker id="test-session" value="2026-11-08T10:15" onChange={vi.fn()} />,
      );

      expect(screen.getByRole('option', { name: '10:15 AM' })).toBeInTheDocument();
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
