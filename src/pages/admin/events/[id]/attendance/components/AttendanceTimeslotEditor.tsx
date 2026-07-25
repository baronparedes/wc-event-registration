import type { FieldErrors } from 'react-hook-form';

import { Button } from '@/components/ui';
import { FormInputField } from '@/components/ui/FormInputField';
import type { AttendanceTimeslotConfig } from '@/lib/domain/attendance';
import { formatDateTime } from '@/lib/infrastructure';

type AttendanceTimeslotEditorProps = {
  eventStartsAt: string | null;
  eventEndsAt: string | null;
  eventStartLocal: string;
  eventEndLocal: string;
  errors: FieldErrors<{ timeslots: AttendanceTimeslotConfig[] }>;
  isArchived: boolean;
  timeslots: AttendanceTimeslotConfig[];
  onAddTimeslot: () => void;
  onRemoveTimeslot: (index: number) => void;
  onUpdateTimeslotField: (
    index: number,
    field: keyof AttendanceTimeslotConfig,
    localValue: string,
  ) => void;
};

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return '';

  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(parsed);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  const hour = parts.find((part) => part.type === 'hour')?.value;
  const minute = parts.find((part) => part.type === 'minute')?.value;

  if (!year || !month || !day || !hour || !minute) {
    return '';
  }

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toErrorMessage(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function AttendanceTimeslotEditor(props: AttendanceTimeslotEditorProps) {
  const {
    eventStartsAt,
    eventEndsAt,
    eventStartLocal,
    eventEndLocal,
    errors,
    isArchived,
    timeslots,
    onAddTimeslot,
    onRemoveTimeslot,
    onUpdateTimeslotField,
  } = props;

  function isWithinEventWindow(localValue: string): boolean {
    if (localValue.length === 0) return true;
    if (eventStartLocal && localValue < eventStartLocal) return false;
    if (eventEndLocal && localValue > eventEndLocal) return false;
    return true;
  }

  function handleTimeslotDateTimeChange(
    index: number,
    field: keyof AttendanceTimeslotConfig,
    localValue: string,
  ) {
    if (!isWithinEventWindow(localValue)) {
      return;
    }

    onUpdateTimeslotField(index, field, localValue);
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text">Timeslots</label>
      <p className="text-xs text-muted">
        Event window: {formatDateTime(eventStartsAt)} to {formatDateTime(eventEndsAt)}
      </p>

      <div className="space-y-2">
        {timeslots.map((slot, index) => (
          <div
            key={`timeslot-${index}`}
            className="rounded-xl border border-border bg-background p-3"
          >
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-start">
              <FormInputField
                id={`timeslot-${index}-slot-at`}
                label="Slot time"
                aria-label={`Timeslot ${index + 1} slot time`}
                type="datetime-local"
                disabled={isArchived}
                value={toDatetimeLocal(slot.slot_at)}
                onChange={(event) =>
                  handleTimeslotDateTimeChange(index, 'slot_at', event.target.value)
                }
                error={toErrorMessage(errors.timeslots?.[index]?.slot_at?.message)}
                inputClassName="rounded-xl bg-surface px-3 py-2 text-sm"
              />
              <FormInputField
                id={`timeslot-${index}-opens-at`}
                label="Opens at"
                aria-label={`Timeslot ${index + 1} opens at`}
                type="datetime-local"
                disabled={isArchived}
                value={toDatetimeLocal(slot.opens_at)}
                onChange={(event) =>
                  handleTimeslotDateTimeChange(index, 'opens_at', event.target.value)
                }
                error={toErrorMessage(errors.timeslots?.[index]?.opens_at?.message)}
                inputClassName="rounded-xl bg-surface px-3 py-2 text-sm"
              />
              <FormInputField
                id={`timeslot-${index}-closes-at`}
                label="Closes at"
                aria-label={`Timeslot ${index + 1} closes at`}
                type="datetime-local"
                disabled={isArchived}
                value={toDatetimeLocal(slot.closes_at)}
                onChange={(event) =>
                  handleTimeslotDateTimeChange(index, 'closes_at', event.target.value)
                }
                error={toErrorMessage(errors.timeslots?.[index]?.closes_at?.message)}
                inputClassName="rounded-xl bg-surface px-3 py-2 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                disabled={isArchived}
                onClick={() => onRemoveTimeslot(index)}
                className="lg:mt-7 lg:self-start"
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" disabled={isArchived} onClick={onAddTimeslot}>
        Add Timeslot
      </Button>
      <p className="text-xs text-muted">
        Pick the slot time and optional check-in window bounds within the event start and end
        date-time range.
      </p>
      {errors.timeslots?.message && (
        <p className="text-xs text-red-600">{errors.timeslots.message}</p>
      )}
    </div>
  );
}
