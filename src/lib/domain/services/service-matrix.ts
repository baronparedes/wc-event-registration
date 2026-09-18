import { isMemberExcused } from '@/lib/domain/hub-calendar/calendar';
import type { ExcusedMemberMap } from '@/lib/domain/hub-calendar/types';

import type { ServiceAttendance } from './types';

export const SERVICE_SUNDAY_KEYS = [
  'first_sunday',
  'second_sunday',
  'third_sunday',
  'fourth_sunday',
  'fifth_sunday',
] as const;

export type ServiceSundayKey = (typeof SERVICE_SUNDAY_KEYS)[number];

export const MATRIX_TIME_SLOTS = ['9AM', '12NN', '3PM'] as const;
export type MatrixTimeSlot = (typeof MATRIX_TIME_SLOTS)[number];

export const MATRIX_SLOT_LABELS: Record<MatrixTimeSlot, string> = {
  '9AM': '9:00 AM',
  '12NN': '12:00 NN',
  '3PM': '3:00 PM',
};

export const SERVICE_SUNDAY_LABELS: Record<
  ServiceSundayKey,
  { label: string; shortLabel: string; ordinal: number }
> = {
  first_sunday: { label: '1st Sunday', shortLabel: '1st Sun', ordinal: 1 },
  second_sunday: { label: '2nd Sunday', shortLabel: '2nd Sun', ordinal: 2 },
  third_sunday: { label: '3rd Sunday', shortLabel: '3rd Sun', ordinal: 3 },
  fourth_sunday: { label: '4th Sunday', shortLabel: '4th Sun', ordinal: 4 },
  fifth_sunday: { label: '5th Sunday', shortLabel: '5th Sun', ordinal: 5 },
};

export interface MonthSunday {
  key: ServiceSundayKey;
  dateStr: string;
  date: Date;
  ordinal: number;
  label: string;
  shortLabel: string;
  formattedDate: string;
}

export type MatrixSlotStatus =
  | 'attended_committed'
  | 'attended_unscheduled'
  | 'missed_committed'
  | 'upcoming_committed'
  | 'off_schedule'
  | 'not_applicable'
  | 'excused';

export interface MatrixCellData {
  sundayKey: ServiceSundayKey;
  sunday?: MonthSunday;
  timeSlot: MatrixTimeSlot;
  isCommitted: boolean;
  attendance?: ServiceAttendance;
  status: MatrixSlotStatus;
  isExcused?: boolean;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeTimeSlot(timeSlot: string): MatrixTimeSlot | string {
  const clean = timeSlot.toUpperCase().replace(/\s+/g, '');
  const matched = MATRIX_TIME_SLOTS.find(
    (slot) => slot.toUpperCase().replace(/\s+/g, '') === clean,
  );
  return matched ?? timeSlot;
}

export function parseCommittedSlots(
  metadata?: Record<string, string> | null,
): Record<ServiceSundayKey, Set<MatrixTimeSlot>> {
  const result: Record<ServiceSundayKey, Set<MatrixTimeSlot>> = {
    first_sunday: new Set(),
    second_sunday: new Set(),
    third_sunday: new Set(),
    fourth_sunday: new Set(),
    fifth_sunday: new Set(),
  };

  if (!metadata) return result;

  for (const [key, value] of Object.entries(metadata)) {
    if (SERVICE_SUNDAY_KEYS.includes(key as ServiceSundayKey) && typeof value === 'string') {
      const parts = value.split(',').map((s) => s.trim().toUpperCase().replace(/\s+/g, ''));
      for (const part of parts) {
        const matched = MATRIX_TIME_SLOTS.find(
          (slot) => slot.toUpperCase().replace(/\s+/g, '') === part,
        );
        if (matched) {
          result[key as ServiceSundayKey].add(matched);
        }
      }
    }
  }

  return result;
}

export function getMonthSundays(year: number, monthIndex: number): MonthSunday[] {
  const sundays: MonthSunday[] = [];
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, monthIndex, day);
    if (d.getDay() === 0 && sundays.length < SERVICE_SUNDAY_KEYS.length) {
      const ordinal = sundays.length + 1;
      const key = SERVICE_SUNDAY_KEYS[sundays.length];
      const dateStr = toISODate(d);
      const formattedDate = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });

      sundays.push({
        key,
        dateStr,
        date: d,
        ordinal,
        label: `${ordinal}${getOrdinalSuffix(ordinal)} Sunday`,
        shortLabel: `${ordinal}${getOrdinalSuffix(ordinal)} Sun`,
        formattedDate,
      });
    }
  }

  return sundays;
}

function getOrdinalSuffix(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

export function computeMatrixGrid(
  sundays: MonthSunday[],
  attendances: ServiceAttendance[],
  committedSlots: Record<ServiceSundayKey, Set<MatrixTimeSlot>>,
  todayStr: string = toISODate(new Date()),
  excusedMap?: ExcusedMemberMap,
  memberId?: string,
): Record<ServiceSundayKey, Record<MatrixTimeSlot, MatrixCellData>> {
  const grid = {} as Record<ServiceSundayKey, Record<MatrixTimeSlot, MatrixCellData>>;
  const sundayByKey = new Map<ServiceSundayKey, MonthSunday>();
  for (const s of sundays) {
    sundayByKey.set(s.key, s);
  }

  for (const key of SERVICE_SUNDAY_KEYS) {
    grid[key] = {} as Record<MatrixTimeSlot, MatrixCellData>;
    const sunday = sundayByKey.get(key);

    for (const timeSlot of MATRIX_TIME_SLOTS) {
      const isCommitted = committedSlots[key].has(timeSlot);

      if (!sunday) {
        grid[key][timeSlot] = {
          sundayKey: key,
          timeSlot,
          isCommitted,
          status: 'not_applicable',
        };
        continue;
      }

      const attendance = attendances.find(
        (a) => a.service_date === sunday.dateStr && normalizeTimeSlot(a.time_slot) === timeSlot,
      );

      let isExcused = false;
      if (excusedMap && memberId && sunday.dateStr) {
        isExcused = isMemberExcused(excusedMap, sunday.dateStr, { id: memberId }, timeSlot);
      }

      let status: MatrixSlotStatus;
      if (attendance) {
        status = isCommitted ? 'attended_committed' : 'attended_unscheduled';
      } else if (isExcused) {
        status = 'excused';
      } else if (isCommitted) {
        status = sunday.dateStr < todayStr ? 'missed_committed' : 'upcoming_committed';
      } else {
        status = 'off_schedule';
      }

      grid[key][timeSlot] = {
        sundayKey: key,
        sunday,
        timeSlot,
        isCommitted,
        attendance,
        status,
        isExcused,
      };
    }
  }

  return grid;
}

export function getNonSundayAttendances(
  attendances: ServiceAttendance[],
  sundays: MonthSunday[],
): ServiceAttendance[] {
  const sundayDates = new Set(sundays.map((s) => s.dateStr));
  return attendances.filter((a) => !sundayDates.has(a.service_date));
}
