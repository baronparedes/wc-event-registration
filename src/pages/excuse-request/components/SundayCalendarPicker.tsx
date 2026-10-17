import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Calendar } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

import { formatDateOnly, formatSundayDisplay, parseDateOnly } from '../utils';

const baseInputClassName =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

const calendarContainerClassName = 'relative [container-type:inline-size]';
const calendarPopoverClassName =
  'absolute z-20 mt-2 max-w-full rounded-md border border-border bg-surface p-3 shadow-lg';
const calendarDayPickerClassName =
  '[--rdp-day-width:clamp(30px,12cqw,44px)] [--rdp-day_button-width:clamp(30px,12cqw,42px)]';

export type SundayCalendarPickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  maxPastDays?: number; // default: 3
  monthsInFuture?: number; // default: 6
  allowedWeekdays?: number[]; // default: [0] (Sunday)
};

export function SundayCalendarPicker({
  id = 'field-request-date',
  value,
  onChange,
  maxPastDays = 3,
  monthsInFuture = 6,
  allowedWeekdays = [0],
}: SundayCalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverId = useId();

  const selectedDate = parseDateOnly(value);

  // Close calendar popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const disabledDays = useMemo(() => {
    const disabled: Array<{ before: Date } | { after: Date } | ((date: Date) => boolean)> = [];

    // Rule 1: max_past_days: 3 (cannot be older than 3 days in the past)
    if (typeof maxPastDays === 'number' && maxPastDays >= 0) {
      const oldestAllowed = new Date();
      oldestAllowed.setHours(0, 0, 0, 0);
      oldestAllowed.setDate(oldestAllowed.getDate() - maxPastDays);
      disabled.push({ before: oldestAllowed });
    }

    // Rule 2: max_days: 6 months from today
    if (typeof monthsInFuture === 'number' && monthsInFuture > 0) {
      const maxFutureDate = new Date();
      maxFutureDate.setHours(23, 59, 59, 999);
      maxFutureDate.setMonth(maxFutureDate.getMonth() + monthsInFuture);
      disabled.push({ after: maxFutureDate });
    }

    // Rule 3: allowed_weekdays: [0] (Sundays only)
    if (allowedWeekdays.length > 0) {
      disabled.push((date: Date) => !allowedWeekdays.includes(date.getDay()));
    }

    return disabled;
  }, [maxPastDays, monthsInFuture, allowedWeekdays]);

  return (
    <div ref={containerRef} className={calendarContainerClassName}>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        className={`${baseInputClassName} flex items-center justify-between gap-3 text-left`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="truncate">{formatSundayDisplay(value)}</span>
        <Calendar className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      </button>

      {isOpen && (
        <div id={popoverId} className={calendarPopoverClassName} role="dialog" aria-modal="true">
          <DayPicker
            className={calendarDayPickerClassName}
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate ?? new Date()}
            disabled={disabledDays}
            onSelect={(selected) => {
              if (!selected) return;
              onChange(formatDateOnly(selected));
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
