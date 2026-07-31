import type { AttendeeSearchResult } from './types';

const MANILA_TIME_ZONE = 'Asia/Manila';

const MANILA_DATE_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: MANILA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const MANILA_MONTH_DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: MANILA_TIME_ZONE,
  month: 'short',
  day: '2-digit',
});

const MANILA_HOUR_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: MANILA_TIME_ZONE,
  hour: 'numeric',
  hour12: true,
});

const MANILA_TIME_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: MANILA_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

type SlotRecordLike = {
  slot: string;
};

function parseSlotTime(isoString: string): Date | null {
  const parsed = new Date(isoString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getManilaDayKey(date: Date): string {
  const parts = MANILA_DATE_PARTS_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
}

function formatCompactSlotLabel(date: Date, includeDatePrefix: boolean): string {
  const timeParts = MANILA_TIME_PARTS_FORMATTER.formatToParts(date);
  const hour = timeParts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = timeParts.find((part) => part.type === 'minute')?.value ?? '';
  const dayPeriod = (
    timeParts.find((part) => part.type === 'dayPeriod')?.value ?? ''
  ).toUpperCase();
  const fallbackHourLabel = MANILA_HOUR_FORMATTER.format(date).replace(/\s+/g, '').toUpperCase();

  const timeLabel =
    hour && dayPeriod
      ? minute === '00' || minute === ''
        ? `${hour}${dayPeriod}`
        : `${hour}:${minute}${dayPeriod}`
      : fallbackHourLabel;

  if (!includeDatePrefix) {
    return timeLabel;
  }

  const monthDayParts = MANILA_MONTH_DAY_FORMATTER.formatToParts(date);
  const month = (monthDayParts.find((part) => part.type === 'month')?.value ?? '').toUpperCase();
  const day = monthDayParts.find((part) => part.type === 'day')?.value ?? '';

  if (!month || !day) {
    return timeLabel;
  }

  return `${month}-${day} ${timeLabel}`;
}

export function formatCompactSlotLabelsFromSlotRecords(
  slotRecords: SlotRecordLike[] | null | undefined,
): string[] {
  if (!slotRecords || slotRecords.length === 0) {
    return [];
  }

  const normalizedSlots = slotRecords
    .map((record) => {
      const parsed = parseSlotTime(record.slot);
      return parsed ? { slot: record.slot, parsed } : null;
    })
    .filter((entry): entry is { slot: string; parsed: Date } => entry !== null)
    .sort((left, right) => left.parsed.getTime() - right.parsed.getTime());

  if (normalizedSlots.length === 0) {
    return [];
  }

  const uniqueBySlot = new Set<string>();
  const uniqueSortedSlots = normalizedSlots.filter((entry) => {
    if (uniqueBySlot.has(entry.slot)) {
      return false;
    }

    uniqueBySlot.add(entry.slot);
    return true;
  });

  const dayKeys = new Set(uniqueSortedSlots.map((entry) => getManilaDayKey(entry.parsed)));
  const includeDatePrefix = dayKeys.size > 1;

  return uniqueSortedSlots.map((entry) => formatCompactSlotLabel(entry.parsed, includeDatePrefix));
}

export function formatCompactCheckedInSlotLabels(
  attendee: Pick<AttendeeSearchResult, 'check_in_status' | 'slot_records'> | null | undefined,
): string[] {
  if (!attendee || attendee.check_in_status !== 'checked_in') {
    return [];
  }

  return formatCompactSlotLabelsFromSlotRecords(attendee.slot_records ?? []);
}
