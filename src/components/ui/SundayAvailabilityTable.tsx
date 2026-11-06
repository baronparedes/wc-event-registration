import React from 'react';

import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from './ListTable';
import { Switch } from './Switch';
import {
  SUNDAY_KEYS,
  SUNDAY_LABELS,
  SUNDAY_SHORT_LABELS,
  SUNDAY_TIME_SLOTS,
  type SundayAvailabilityValue,
  type SundayKey,
  type SundayTimeSlot,
} from './sundayAvailabilityConstants';

export interface SundayAvailabilityTableProps {
  value: SundayAvailabilityValue;
  onChange?: (sundayKey: SundayKey, timeSlot: SundayTimeSlot, checked: boolean) => void;
  disabled?: boolean;
  readOnly?: boolean;
  density?: 'dense' | 'default';
  className?: string;
  headerWeekLabel?: string;
  ariaLabelFormat?: (sundayLabel: string, timeSlot: SundayTimeSlot) => string;
}

function hasTimeSlot(
  source: SundayAvailabilityValue,
  sundayKey: SundayKey,
  timeSlot: SundayTimeSlot,
): boolean {
  const dayValue = source[sundayKey];
  if (!dayValue) return false;

  if (dayValue instanceof Set) {
    const rawSet = dayValue as Set<string>;
    return (
      rawSet.has(timeSlot) ||
      rawSet.has(timeSlot.replace(' ', '')) ||
      rawSet.has(timeSlot.replace('AM', ' AM').replace('NN', ' NN').replace('PM', ' PM'))
    );
  }

  if (Array.isArray(dayValue)) {
    return dayValue.some(
      (t) =>
        t === timeSlot ||
        t.replace(/\s+/g, '').toUpperCase() === timeSlot.replace(/\s+/g, '').toUpperCase(),
    );
  }

  return false;
}

function getSelectedCount(source: SundayAvailabilityValue, sundayKey: SundayKey): number {
  return SUNDAY_TIME_SLOTS.reduce(
    (acc, slot) => (hasTimeSlot(source, sundayKey, slot) ? acc + 1 : acc),
    0,
  );
}

export const SundayAvailabilityTable: React.FC<SundayAvailabilityTableProps> = ({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  density = 'dense',
  className = 'min-w-full',
  headerWeekLabel = 'Week',
  ariaLabelFormat,
}) => {
  return (
    <ListTable density={density} className={className}>
      <ListTableHead>
        <ListTableHeaderRow variant="default">
          <ListTableHeaderCell className="px-2.5 py-3 sm:px-4 text-left font-semibold">
            {headerWeekLabel}
          </ListTableHeaderCell>
          {SUNDAY_TIME_SLOTS.map((time) => (
            <ListTableHeaderCell key={time} className="px-2 py-3 sm:px-4 text-center font-semibold">
              {time.replace('AM', ' AM').replace('NN', ' NN').replace('PM', ' PM')}
            </ListTableHeaderCell>
          ))}
        </ListTableHeaderRow>
      </ListTableHead>
      <ListTableBody divider="default">
        {SUNDAY_KEYS.map((key) => {
          const selectedCount = getSelectedCount(value, key);
          const sundayLabel = SUNDAY_LABELS[key];
          const sundayShortLabel = SUNDAY_SHORT_LABELS[key];

          return (
            <ListTableRow key={key} hover="muted">
              <ListTableCell className="px-2.5 py-3 sm:px-4 font-medium text-text">
                <div className="flex items-center gap-1.5">
                  <span className="hidden sm:inline">{sundayLabel}</span>
                  <span className="sm:hidden">{sundayShortLabel}</span>
                  {selectedCount > 0 && (
                    <span
                      aria-label={`${selectedCount} slots selected`}
                      className="inline-flex items-center justify-center rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-bold text-primary sm:hidden"
                    >
                      {selectedCount}
                    </span>
                  )}
                </div>
              </ListTableCell>
              {SUNDAY_TIME_SLOTS.map((time) => {
                const isChecked = hasTimeSlot(value, key, time);
                const defaultLabel = `Toggle ${sundayLabel} at ${time}`;
                const ariaLabel = ariaLabelFormat
                  ? ariaLabelFormat(sundayLabel, time)
                  : defaultLabel;

                return (
                  <ListTableCell key={time} className="px-2 py-3 sm:px-4 text-center">
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (readOnly || disabled) return;
                          onChange?.(key, time, checked);
                        }}
                        disabled={disabled || readOnly}
                        ariaLabel={ariaLabel}
                        size="sm"
                      />
                    </div>
                  </ListTableCell>
                );
              })}
            </ListTableRow>
          );
        })}
      </ListTableBody>
    </ListTable>
  );
};
