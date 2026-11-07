import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Calendar } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

function parseDateOnly(value: string | undefined): Date | undefined {
  if (!value || value.length < 10) {
    return undefined;
  }

  const [yearString, monthString, dayString] = value.slice(0, 10).split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined;
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }

  return date;
}

function formatDateOnly(value: Date): string {
  const year = String(value.getFullYear());
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSundayDisplay(
  dateString: string | undefined,
  placeholder = 'Select Sunday date',
): string {
  const parsed = parseDateOnly(dateString);
  if (!parsed) return placeholder;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const baseInputClassName =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

const calendarContainerClassName = 'relative';
const calendarPopoverClassName =
  'absolute z-30 mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-4 shadow-xl';
const calendarDayPickerClassName =
  '[--rdp-accent-color:var(--color-primary)] [--rdp-accent-background-color:rgba(28,160,179,0.12)] [--rdp-today-color:var(--color-primary)] [--rdp-selected-border:2px_solid_var(--color-primary)] [--rdp-day-width:40px] [--rdp-day_button-width:38px] [--rdp-day_button-height:38px]';

export type SundayCalendarPickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  maxPastDays?: number | null; // default: 3. Pass null to disable past-date restriction.
  monthsInFuture?: number; // default: 6
  allowedWeekdays?: number[]; // default: [0] (Sunday)
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  align?: 'left' | 'right';
  popoverClassName?: string;
};

export function SundayCalendarPicker({
  id = 'field-request-date',
  value,
  onChange,
  maxPastDays = 3,
  monthsInFuture = 6,
  allowedWeekdays = [0],
  minDate,
  maxDate,
  disabled = false,
  className = '',
  placeholder,
  align = 'left',
  popoverClassName = '',
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

    if (minDate) {
      disabled.push({ before: minDate });
    }

    // Rule 2: max_days: 6 months from today
    if (typeof monthsInFuture === 'number' && monthsInFuture > 0) {
      const maxFutureDate = new Date();
      maxFutureDate.setHours(23, 59, 59, 999);
      maxFutureDate.setMonth(maxFutureDate.getMonth() + monthsInFuture);
      disabled.push({ after: maxFutureDate });
    }

    if (maxDate) {
      disabled.push({ after: maxDate });
    }

    // Rule 3: allowed_weekdays: [0] (Sundays only)
    if (allowedWeekdays.length > 0) {
      disabled.push((date: Date) => !allowedWeekdays.includes(date.getDay()));
    }

    return disabled;
  }, [maxPastDays, monthsInFuture, allowedWeekdays, minDate, maxDate]);

  return (
    <div ref={containerRef} className={calendarContainerClassName}>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        disabled={disabled}
        className={`${baseInputClassName} flex items-center justify-between gap-3 text-left ${
          isOpen ? 'border-primary ring-2 ring-primary/20' : ''
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-surface/50' : ''} ${className}`}
        onClick={() => {
          if (disabled) return;
          setIsOpen((open) => !open);
        }}
      >
        <span className={`truncate font-medium ${!value ? 'text-muted' : 'text-text'}`}>
          {formatSundayDisplay(value, placeholder)}
        </span>
        <Calendar
          className={`h-4 w-4 shrink-0 transition-colors ${isOpen ? 'text-primary' : 'text-muted'}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={popoverId}
          className={`${calendarPopoverClassName} ${align === 'right' ? 'right-0' : 'left-0'} ${popoverClassName}`}
          role="dialog"
          aria-modal="true"
        >
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
          <div className="mt-2.5 border-t border-border pt-2 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              Only upcoming Sunday service dates can be selected
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
