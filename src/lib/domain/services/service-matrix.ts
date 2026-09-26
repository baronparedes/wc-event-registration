import type { ServiceAttendance, UserCommitmentSnapshot } from './types';

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
  | 'excused'
  | 'service_exception'
  | 'loading';

export interface MatrixCellData {
  sundayKey: ServiceSundayKey;
  sunday?: MonthSunday;
  timeSlot: MatrixTimeSlot;
  isCommitted: boolean;
  attendance?: ServiceAttendance;
  status: MatrixSlotStatus;
  excusedReason?: string;
  exceptionReason?: string;
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

export function resolveMetadataForDate(
  targetDate: string,
  currentMetadata: Record<string, string> | null | undefined,
  snapshots: UserCommitmentSnapshot[],
): Record<string, string> | null | undefined {
  // snapshots are assumed to be sorted by effective_date descending
  const applicableSnapshot = snapshots.find((s) => s.effective_date <= targetDate);
  if (applicableSnapshot) {
    return applicableSnapshot.metadata as Record<string, string>;
  }
  // If no snapshot applies (or before the first snapshot), fall back to current metadata
  return currentMetadata;
}

export function computeMatrixGrid(
  sundays: MonthSunday[],
  attendances: ServiceAttendance[],
  currentMetadata: Record<string, string> | null | undefined,
  snapshots: UserCommitmentSnapshot[],
  excusedRecords: { requestDate: string; services: string; reason?: string }[] = [],
  todayStr: string = toISODate(new Date()),
  isLoadingAttendance: boolean = false,
  isLoadingExcused: boolean = false,
  exceptionDates: { exception_date: string; reason: string }[] = [],
): Record<ServiceSundayKey, Record<MatrixTimeSlot, MatrixCellData>> {
  const grid = {} as Record<ServiceSundayKey, Record<MatrixTimeSlot, MatrixCellData>>;
  const sundayByKey = new Map<ServiceSundayKey, MonthSunday>();
  for (const s of sundays) {
    sundayByKey.set(s.key, s);
  }

  // Pre-parse current metadata to be used when there is no sunday matched
  const currentCommittedSlots = parseCommittedSlots(currentMetadata);

  for (const key of SERVICE_SUNDAY_KEYS) {
    grid[key] = {} as Record<MatrixTimeSlot, MatrixCellData>;
    const sunday = sundayByKey.get(key);

    // Determine committed slots for the specific sunday
    let sundayCommittedSlots: Set<MatrixTimeSlot>;

    if (sunday) {
      const activeMetadata = resolveMetadataForDate(sunday.dateStr, currentMetadata, snapshots);
      const parsedSlots = parseCommittedSlots(activeMetadata);
      sundayCommittedSlots = parsedSlots[key];
    } else {
      sundayCommittedSlots = currentCommittedSlots[key];
    }

    const exceptionRecord = sunday
      ? exceptionDates.find((e) => e.exception_date === sunday.dateStr)
      : undefined;

    for (const timeSlot of MATRIX_TIME_SLOTS) {
      const isCommitted = sundayCommittedSlots.has(timeSlot);

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

      const excusedRecord = excusedRecords.find(
        (er) =>
          er.requestDate === sunday.dateStr &&
          er.services.toUpperCase().replace(/\s+/g, '').includes(timeSlot.toUpperCase()),
      );

      let status: MatrixSlotStatus;
      if (attendance) {
        status = isCommitted ? 'attended_committed' : 'attended_unscheduled';
      } else if (isLoadingAttendance) {
        status = isCommitted ? 'loading' : 'off_schedule';
      } else if (exceptionRecord) {
        status = isCommitted ? 'service_exception' : 'off_schedule';
      } else if (isCommitted) {
        if (excusedRecord) {
          status = 'excused';
        } else if (isLoadingExcused) {
          status = 'loading';
        } else {
          status = sunday.dateStr < todayStr ? 'missed_committed' : 'upcoming_committed';
        }
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
        excusedReason: excusedRecord?.reason,
        exceptionReason: exceptionRecord?.reason,
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
