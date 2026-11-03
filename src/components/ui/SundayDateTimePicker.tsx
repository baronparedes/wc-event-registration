import { useId, useState } from 'react';

import { Calendar, Clock } from 'lucide-react';

import { SundayCalendarPicker } from './SundayCalendarPicker';
import {
  formatDisplayDateTime,
  parse12HourTimeString,
  parseDateTimeParts,
  split24HourTime,
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

  const { datePart, timePart } = parseDateTimeParts(value);

  const [prevTimePart, setPrevTimePart] = useState(timePart);
  const [timeInput, setTimeInput] = useState<string>(() => split24HourTime(timePart).timeStr);
  const [period, setPeriod] = useState<'AM' | 'PM'>(() => split24HourTime(timePart).period);

  // Adjust state during render when incoming timePart changes per official React recommendations
  if (timePart !== prevTimePart) {
    setPrevTimePart(timePart);
    const parsed = split24HourTime(timePart);
    setTimeInput(parsed.timeStr);
    setPeriod(parsed.period);
  }

  const isInactive = disabled || readOnly;

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      onChange('');
      return;
    }
    const parsed = parse12HourTimeString(timeInput, period);
    const effectiveTime24 = parsed?.time24 || timePart || '09:00';
    onChange(`${newDate}T${effectiveTime24}`);
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTimeInput(val);

    const parsed = parse12HourTimeString(val, period);
    if (parsed) {
      if (parsed.period !== period) {
        setPeriod(parsed.period);
      }
      if (datePart) {
        onChange(`${datePart}T${parsed.time24}`);
      }
    }
  };

  const handleTimeInputBlur = () => {
    const parsed = parse12HourTimeString(timeInput, period);
    if (parsed) {
      setTimeInput(parsed.timeStr);
      setPeriod(parsed.period);
      if (datePart) {
        onChange(`${datePart}T${parsed.time24}`);
      }
    } else {
      // Revert to last valid
      const fallback = split24HourTime(timePart || '09:00');
      setTimeInput(fallback.timeStr);
      setPeriod(fallback.period);
    }
  };

  const handlePeriodToggle = (newPeriod: 'AM' | 'PM') => {
    if (newPeriod === period || isInactive) return;
    setPeriod(newPeriod);

    const parsed = parse12HourTimeString(timeInput, newPeriod);
    if (parsed && datePart) {
      onChange(`${datePart}T${parsed.time24}`);
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
              {formatDisplayDateTime(datePart, timePart)}
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

          <div className="relative flex items-center min-h-[46px] rounded-md border border-border bg-background px-2.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Clock className="h-4 w-4 text-muted shrink-0 mr-1.5" aria-hidden="true" />
            <input
              id={`${pickerId}-time`}
              type="text"
              aria-label="Session Time"
              placeholder="9:00"
              value={timeInput}
              onChange={handleTimeInputChange}
              onBlur={handleTimeInputBlur}
              disabled={isInactive}
              className="w-full min-w-0 bg-transparent text-sm font-medium text-text outline-none placeholder:text-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="flex items-center rounded-md border border-border/80 bg-surface p-0.5 text-xs font-semibold shrink-0 ml-1.5">
              <button
                type="button"
                disabled={isInactive}
                onClick={() => handlePeriodToggle('AM')}
                className={`rounded px-1.5 py-1 text-[11px] font-semibold transition-all ${
                  period === 'AM'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted hover:text-text disabled:opacity-50'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                disabled={isInactive}
                onClick={() => handlePeriodToggle('PM')}
                className={`rounded px-1.5 py-1 text-[11px] font-semibold transition-all ${
                  period === 'PM'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted hover:text-text disabled:opacity-50'
                }`}
              >
                PM
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
      {helperText && !error && <p className="text-xs text-muted">{helperText}</p>}
    </div>
  );
}
