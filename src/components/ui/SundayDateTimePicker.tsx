import { useId, useState } from 'react';

import { Calendar, Clock } from 'lucide-react';

import { SundayCalendarPicker } from './SundayCalendarPicker';
import {
  DEFAULT_SUNDAY_TIME_SLOTS,
  formatDisplayDateTime,
  formatTime12Hour,
  parseDateTimeParts,
} from './sundayDateTimeUtils';

export interface SundayDateTimePickerProps {
  id?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  maxPastDays?: number | null;
  monthsInFuture?: number;
  placeholder?: string;
  className?: string;
}

export function SundayDateTimePicker({
  id = 'sunday-date-time-picker',
  label = 'Session Date & Time',
  required = false,
  disabled = false,
  readOnly = false,
  value = '',
  onChange,
  error,
  helperText,
  maxPastDays = null,
  monthsInFuture = 6,
  placeholder = 'Select Sunday date',
  className = '',
}: SundayDateTimePickerProps) {
  const generatedId = useId();
  const pickerId = id || generatedId;

  const { datePart, timePart: parsedTimePart } = parseDateTimeParts(value);
  const [localTime, setLocalTime] = useState<string>('09:00');

  const effectiveTime = datePart ? parsedTimePart : localTime || '09:00';
  const isInactive = disabled || readOnly;

  // Cheap array map derived inline per React anti-pattern guidelines (no trivial memoization)
  const slots = [...DEFAULT_SUNDAY_TIME_SLOTS];
  if (effectiveTime && !slots.includes(effectiveTime)) {
    slots.push(effectiveTime);
    slots.sort();
  }
  const timeOptions = slots.map((t) => ({
    value: t,
    label: formatTime12Hour(t),
  }));

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      onChange('');
      return;
    }
    const timeToUse = effectiveTime || '09:00';
    onChange(`${newDate}T${timeToUse}`);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTime = e.target.value;
    setLocalTime(newTime);
    if (datePart) {
      onChange(`${datePart}T${newTime}`);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={`${pickerId}-date`} className="block text-sm font-semibold text-text">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      {isInactive ? (
        <div className="flex items-center gap-2.5 rounded-md border border-border/80 bg-surface/60 px-3 py-2.5 min-h-[46px] text-sm text-text shadow-xs">
          <Calendar className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          {datePart ? (
            <span className="font-medium truncate">
              {formatDisplayDateTime(datePart, effectiveTime)}
            </span>
          ) : (
            <span className="text-muted truncate">No session date recorded</span>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 xs:grid-cols-[1.35fr_1fr]">
          <div className="relative">
            <SundayCalendarPicker
              id={`${pickerId}-date`}
              value={datePart}
              onChange={handleDateChange}
              disabled={isInactive}
              maxPastDays={maxPastDays}
              monthsInFuture={monthsInFuture}
              placeholder={placeholder}
              className="min-h-[46px]"
            />
          </div>

          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 flex items-center text-muted">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </span>
            <select
              id={`${pickerId}-time`}
              aria-label="Session Time"
              value={effectiveTime}
              onChange={handleTimeChange}
              disabled={isInactive}
              className="w-full min-h-[46px] rounded-md border border-border bg-background pl-9 pr-8 py-2.5 text-sm font-medium text-text transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {timeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
      {helperText && !error && <p className="text-xs text-muted">{helperText}</p>}
    </div>
  );
}
