import { useMemo, useState } from 'react';

import { Calendar } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { type UseFormReturn, useWatch } from 'react-hook-form';

import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields';

const baseInputClassName =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary';

const calendarContainerClassName = 'relative';
const calendarPopoverClassName =
  'absolute z-20 mt-2 rounded-md border border-border bg-surface p-3 shadow-lg';

type DateFieldRendererProps = {
  field: PublicEventField;
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>;
};

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function parseAllowedWeekdays(field: PublicEventField): number[] {
  const raw = field.validation_rules.allowed_weekdays;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((value): value is number => typeof value === 'number' && value >= 0 && value <= 6)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((a, b) => a - b);
}

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

  return new Date(year, month - 1, day);
}

function formatDateOnly(value: Date): string {
  const year = String(value.getFullYear());
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function splitDatetimeValue(value: string | undefined): { datePart: string; timePart: string } {
  if (!value || !value.includes('T')) {
    return { datePart: '', timePart: '' };
  }

  const [datePart, rawTimePart] = value.split('T');
  const timePart = rawTimePart?.slice(0, 5) ?? '';
  return { datePart, timePart };
}

function joinDatetimeValue(datePart: string, timePart: string): string {
  if (!datePart || !timePart) {
    return '';
  }

  return `${datePart}T${timePart}`;
}

function buildDisabledDays(
  allowedWeekdays: number[],
  minDate: string | undefined,
  maxDate: string | undefined,
) {
  const disabled: Array<{ before: Date } | { after: Date } | ((date: Date) => boolean)> = [];
  const minDateParsed = parseDateOnly(minDate);
  const maxDateParsed = parseDateOnly(maxDate);

  if (minDateParsed) {
    disabled.push({ before: minDateParsed });
  }

  if (maxDateParsed) {
    disabled.push({ after: maxDateParsed });
  }

  if (allowedWeekdays.length > 0) {
    disabled.push((date: Date) => !allowedWeekdays.includes(date.getDay()));
  }

  return disabled;
}

function extractWeekday(value: string): number | null {
  const [yearString, monthString, dayString] = value.slice(0, 10).split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function buildWeekdayValidationMessage(allowedWeekdays: number[]): string {
  const labels = allowedWeekdays.map((weekday) => WEEKDAY_LABELS[weekday]).join(', ');
  return `Please select a valid date for ${labels}.`;
}

export function DateFieldRenderer({ field, dynamicForm }: DateFieldRendererProps) {
  const allowedWeekdays = parseAllowedWeekdays(field);
  const [isOpen, setIsOpen] = useState(false);
  const value = useWatch({ control: dynamicForm.control, name: field.field_key }) as
    | string
    | undefined;

  const selectedDate = parseDateOnly(value);
  const disabledDays = useMemo(
    () =>
      buildDisabledDays(
        allowedWeekdays,
        field.validation_rules.min_date,
        field.validation_rules.max_date,
      ),
    [allowedWeekdays, field.validation_rules.max_date, field.validation_rules.min_date],
  );

  return (
    <div className={calendarContainerClassName}>
      <input
        type="hidden"
        {...dynamicForm.register(field.field_key, {
          validate: (innerValue) => {
            if (
              typeof innerValue !== 'string' ||
              innerValue.length === 0 ||
              allowedWeekdays.length === 0
            ) {
              return true;
            }

            const weekday = extractWeekday(innerValue);
            if (weekday === null || !allowedWeekdays.includes(weekday)) {
              return buildWeekdayValidationMessage(allowedWeekdays);
            }

            return true;
          },
        })}
      />
      <button
        id={`field-${field.field_key}`}
        type="button"
        className={`${baseInputClassName} flex items-center justify-between gap-3 text-left`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="truncate">{value && value.length > 0 ? value : 'Select date'}</span>
        <Calendar className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className={calendarPopoverClassName}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            disabled={disabledDays}
            onSelect={(selected) => {
              if (!selected) {
                return;
              }

              dynamicForm.setValue(field.field_key, formatDateOnly(selected), {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

export function DatetimeFieldRenderer({ field, dynamicForm }: DateFieldRendererProps) {
  const allowedWeekdays = parseAllowedWeekdays(field);
  const [isOpen, setIsOpen] = useState(false);
  const value = useWatch({ control: dynamicForm.control, name: field.field_key }) as
    | string
    | undefined;
  const { datePart, timePart } = splitDatetimeValue(value);

  const selectedDate = parseDateOnly(datePart);
  const disabledDays = useMemo(
    () =>
      buildDisabledDays(
        allowedWeekdays,
        field.validation_rules.min_date,
        field.validation_rules.max_date,
      ),
    [allowedWeekdays, field.validation_rules.max_date, field.validation_rules.min_date],
  );

  return (
    <div className="space-y-2">
      <input
        type="hidden"
        {...dynamicForm.register(field.field_key, {
          validate: (innerValue) => {
            if (
              typeof innerValue !== 'string' ||
              innerValue.length === 0 ||
              allowedWeekdays.length === 0
            ) {
              return true;
            }

            const weekday = extractWeekday(innerValue);
            if (weekday === null || !allowedWeekdays.includes(weekday)) {
              return buildWeekdayValidationMessage(allowedWeekdays);
            }

            return true;
          },
        })}
      />
      <div className={calendarContainerClassName}>
        <button
          id={`field-${field.field_key}`}
          type="button"
          className={`${baseInputClassName} flex items-center justify-between gap-3 text-left`}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="truncate">{datePart.length > 0 ? datePart : 'Select date'}</span>
          <Calendar className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </button>
        {isOpen && (
          <div className={calendarPopoverClassName}>
            <DayPicker
              mode="single"
              selected={selectedDate}
              disabled={disabledDays}
              onSelect={(selected) => {
                if (!selected) {
                  return;
                }

                const nextDatePart = formatDateOnly(selected);
                const nextTimePart = timePart.length > 0 ? timePart : '00:00';
                dynamicForm.setValue(
                  field.field_key,
                  joinDatetimeValue(nextDatePart, nextTimePart),
                  {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  },
                );
                setIsOpen(false);
              }}
            />
          </div>
        )}
      </div>
      <input
        type="time"
        className={baseInputClassName}
        value={timePart}
        disabled={datePart.length === 0}
        onChange={(event) => {
          dynamicForm.setValue(field.field_key, joinDatetimeValue(datePart, event.target.value), {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        }}
      />
    </div>
  );
}
