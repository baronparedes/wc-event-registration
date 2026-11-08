import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Calendar, ChevronDown, Clock, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

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
  align?: 'left' | 'right';
  popoverClassName?: string;
}

function parseDateOnly(value: string | undefined): Date | undefined {
  if (!value || value.length < 10) return undefined;
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

const calendarDayPickerClassName =
  '[--rdp-accent-color:var(--color-primary)] [--rdp-accent-background-color:rgba(28,160,179,0.12)] [--rdp-today-color:var(--color-primary)] [--rdp-selected-border:2px_solid_var(--color-primary)] [--rdp-day-width:40px] [--rdp-day_button-width:38px] [--rdp-day_button-height:38px]';

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
  placeholder = 'Select Sunday date & time...',
  className = '',
  align = 'left',
  popoverClassName = '',
}: SundayDateTimePickerProps) {
  const generatedId = useId();
  const popoverId = useId();
  const pickerId = id || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
  const selectedDate = parseDateOnly(datePart);

  // Close calendar popover when clicking outside (guarded on open state per React anti-pattern guidelines)
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
    const disabledList: Array<{ before: Date } | { after: Date } | ((date: Date) => boolean)> = [];

    // Optional past days limit
    if (typeof maxPastDays === 'number' && maxPastDays >= 0) {
      const oldestAllowed = new Date();
      oldestAllowed.setHours(0, 0, 0, 0);
      oldestAllowed.setDate(oldestAllowed.getDate() - maxPastDays);
      disabledList.push({ before: oldestAllowed });
    }

    // Future months limit
    if (typeof monthsInFuture === 'number' && monthsInFuture > 0) {
      const maxFutureDate = new Date();
      maxFutureDate.setHours(23, 59, 59, 999);
      maxFutureDate.setMonth(maxFutureDate.getMonth() + monthsInFuture);
      disabledList.push({ after: maxFutureDate });
    }

    // Sundays only: weekday 0
    disabledList.push((date: Date) => date.getDay() !== 0);

    return disabledList;
  }, [maxPastDays, monthsInFuture]);

  const handleDateSelect = (newDateObj: Date | undefined) => {
    if (!newDateObj) return;
    const newDateStr = formatDateOnly(newDateObj);
    const parsed = parse12HourTimeString(timeInput, period);
    const effectiveTime24 = parsed?.time24 || timePart || '09:00';
    onChange(`${newDateStr}T${effectiveTime24}`);
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isInactive || !datePart) return;
    const val = e.target.value;
    setTimeInput(val);

    const parsed = parse12HourTimeString(val, period);
    if (parsed) {
      if (parsed.period !== period) {
        setPeriod(parsed.period);
      }
      onChange(`${datePart}T${parsed.time24}`);
    }
  };

  const handleTimeInputBlur = () => {
    if (isInactive || !datePart) return;
    const parsed = parse12HourTimeString(timeInput, period);
    if (parsed) {
      setTimeInput(parsed.timeStr);
      setPeriod(parsed.period);
      onChange(`${datePart}T${parsed.time24}`);
    } else {
      const fallback = split24HourTime(timePart || '09:00');
      setTimeInput(fallback.timeStr);
      setPeriod(fallback.period);
    }
  };

  const handlePeriodToggle = (newPeriod: 'AM' | 'PM') => {
    if (newPeriod === period || isInactive || !datePart) return;
    setPeriod(newPeriod);

    const parsed = parse12HourTimeString(timeInput, newPeriod);
    if (parsed) {
      onChange(`${datePart}T${parsed.time24}`);
    }
  };

  const handlePresetClick = (presetTime24: string) => {
    if (isInactive || !datePart) return;
    const parsed = split24HourTime(presetTime24);
    setTimeInput(parsed.timeStr);
    setPeriod(parsed.period);
    onChange(`${datePart}T${presetTime24}`);
  };

  const displayDateTimeText = datePart ? formatDisplayDateTime(datePart, timePart) : '';

  let borderStateClass = 'border-border focus:border-primary';
  if (isOpen) {
    borderStateClass = 'border-primary ring-2 ring-primary/20';
  } else if (error) {
    borderStateClass = 'border-danger';
  }

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={pickerId} className="block text-sm font-semibold text-text">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      {isInactive ? (
        <div className="flex items-center gap-2.5 rounded-md border border-border/80 bg-surface/60 px-3 py-2.5 min-h-[46px] text-sm text-text shadow-xs">
          <Calendar className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          {displayDateTimeText ? (
            <span className="font-medium truncate">{displayDateTimeText}</span>
          ) : (
            <span className="text-muted truncate">No session date recorded</span>
          )}
        </div>
      ) : (
        <div className="relative">
          <button
            id={pickerId}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-controls={isOpen ? popoverId : undefined}
            aria-label={`${label ? `${label}: ` : ''}${displayDateTimeText || placeholder}`}
            disabled={isInactive}
            onClick={() => setIsOpen((prev) => !prev)}
            className={`w-full min-h-[46px] rounded-md border bg-background px-3 py-2.5 text-left text-sm text-text transition flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-primary/20 ${borderStateClass} ${isInactive ? 'opacity-60 cursor-not-allowed bg-surface/50' : 'hover:border-primary/60'}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Calendar className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <span className={`truncate font-medium ${!datePart ? 'text-muted' : 'text-text'}`}>
                {displayDateTimeText || placeholder}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {value && !isInactive && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Clear session date and time"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      e.preventDefault();
                      onChange('');
                    }
                  }}
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-muted transition-colors hover:bg-surface-hover hover:text-text cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              )}
              <ChevronDown
                className={`h-4 w-4 text-muted transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-primary' : ''
                }`}
                aria-hidden="true"
              />
            </div>
          </button>

          {/* Unified Date & Time Popover */}
          {isOpen && (
            <div
              id={popoverId}
              role="dialog"
              aria-modal="true"
              aria-label="Select Sunday session date and time"
              className={`absolute z-30 mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-4 shadow-xl ${
                align === 'right' ? 'right-0' : 'left-0'
              } ${popoverClassName}`}
            >
              {/* Sunday Calendar */}
              <DayPicker
                className={calendarDayPickerClassName}
                mode="single"
                selected={selectedDate}
                defaultMonth={selectedDate ?? new Date()}
                disabled={disabledDays}
                onSelect={handleDateSelect}
              />

              {/* Integrated Time Section (disabled until Sunday date is picked) */}
              <div
                className={`space-y-2 border-t border-border mt-3 pt-3 transition-opacity ${!datePart ? 'opacity-50' : 'opacity-100'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock
                      className={`h-3.5 w-3.5 ${!datePart ? 'text-muted' : 'text-primary'}`}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-xs font-semibold ${!datePart ? 'text-muted' : 'text-text'}`}
                    >
                      Session Time
                    </span>
                    {!datePart && (
                      <span className="text-[10px] text-muted font-normal">(Pick date first)</span>
                    )}
                  </div>

                  {/* 1-Click CCF Sunday Service Presets */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isInactive || !datePart}
                      onClick={() => handlePresetClick('09:00')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${
                        timePart === '09:00' && datePart
                          ? 'bg-primary text-white'
                          : 'bg-background text-muted hover:text-text border border-border/60'
                      } ${!datePart ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      9 AM
                    </button>
                    <button
                      type="button"
                      disabled={isInactive || !datePart}
                      onClick={() => handlePresetClick('12:00')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${
                        timePart === '12:00' && datePart
                          ? 'bg-primary text-white'
                          : 'bg-background text-muted hover:text-text border border-border/60'
                      } ${!datePart ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      12 NN
                    </button>
                    <button
                      type="button"
                      disabled={isInactive || !datePart}
                      onClick={() => handlePresetClick('15:00')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${
                        timePart === '15:00' && datePart
                          ? 'bg-primary text-white'
                          : 'bg-background text-muted hover:text-text border border-border/60'
                      }`}
                    >
                      3 PM
                    </button>
                  </div>
                </div>

                {/* Custom Time Input & AM/PM Toggle */}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`relative flex-1 flex items-center rounded-lg border bg-background px-2.5 py-1.5 ${
                      !datePart
                        ? 'border-border/60 bg-muted/10 cursor-not-allowed'
                        : 'border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20'
                    }`}
                  >
                    <input
                      id={`${pickerId}-time`}
                      type="text"
                      aria-label="Session Time"
                      placeholder={!datePart ? 'Select a Sunday date first...' : 'e.g. 1:52 PM'}
                      value={datePart ? timeInput : ''}
                      onChange={handleTimeInputChange}
                      onBlur={handleTimeInputBlur}
                      disabled={isInactive || !datePart}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleTimeInputBlur();
                        }
                      }}
                      className="w-full bg-transparent text-xs font-semibold text-text outline-none placeholder:text-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  <div className="flex items-center rounded-lg border border-border bg-background p-0.5 text-xs font-semibold shrink-0">
                    <button
                      type="button"
                      disabled={isInactive || !datePart}
                      onClick={() => handlePeriodToggle('AM')}
                      className={`rounded px-2 py-1 text-[11px] font-semibold transition-all ${
                        period === 'AM' && datePart
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-muted hover:text-text disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      disabled={isInactive || !datePart}
                      onClick={() => handlePeriodToggle('PM')}
                      className={`rounded px-2 py-1 text-[11px] font-semibold transition-all ${
                        period === 'PM' && datePart
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-muted hover:text-text disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>

              {/* Popover Footer */}
              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                  Only upcoming Sundays
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-primary/90"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
      {helperText && !error && <p className="text-xs text-muted">{helperText}</p>}
    </div>
  );
}
