import type { AttendanceSettings, AttendanceTimeslotConfig } from './types';

type LegacyTimeslotValue = string | AttendanceTimeslotConfig | null | undefined;

type LegacyTimeslotObject = {
  slot_at?: unknown;
  opens_at?: unknown;
  closes_at?: unknown;
};

function normalizeOptionalIsoString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isTimeslotConfig(value: LegacyTimeslotValue): value is AttendanceTimeslotConfig {
  return Boolean(value && typeof value === 'object' && 'slot_at' in value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function tryParseNestedTimeslotObject(value: string): LegacyTimeslotObject | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return isRecord(parsed) ? (parsed as LegacyTimeslotObject) : null;
  } catch {
    return null;
  }
}

function normalizeStructuredTimeslot(
  entry: AttendanceTimeslotConfig,
): AttendanceTimeslotConfig | null {
  const nested = tryParseNestedTimeslotObject(entry.slot_at);

  const slotAtSource =
    nested && typeof nested.slot_at === 'string' ? nested.slot_at : entry.slot_at;
  const opensAtSource =
    entry.opens_at ?? (nested && typeof nested.opens_at === 'string' ? nested.opens_at : null);
  const closesAtSource =
    entry.closes_at ?? (nested && typeof nested.closes_at === 'string' ? nested.closes_at : null);

  const slotAt = normalizeOptionalIsoString(slotAtSource);

  if (!slotAt) {
    return null;
  }

  return {
    slot_at: slotAt,
    opens_at: normalizeOptionalIsoString(opensAtSource),
    closes_at: normalizeOptionalIsoString(closesAtSource),
  };
}

function compareTimeslotConfig(
  left: AttendanceTimeslotConfig,
  right: AttendanceTimeslotConfig,
): number {
  const leftTime = Date.parse(left.slot_at);
  const rightTime = Date.parse(right.slot_at);

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    return leftTime - rightTime;
  }

  return left.slot_at.localeCompare(right.slot_at);
}

export function normalizeAttendanceTimeslots(
  timeslots: LegacyTimeslotValue[] | null | undefined,
): AttendanceTimeslotConfig[] {
  if (!Array.isArray(timeslots)) {
    return [];
  }

  const seen = new Set<string>();

  return timeslots
    .map((entry) => {
      if (typeof entry === 'string') {
        const slotAt = normalizeOptionalIsoString(entry);

        return slotAt
          ? {
              slot_at: slotAt,
              opens_at: null,
              closes_at: null,
            }
          : null;
      }

      if (!isTimeslotConfig(entry)) {
        return null;
      }

      return normalizeStructuredTimeslot(entry);
    })
    .filter((entry): entry is AttendanceTimeslotConfig => entry !== null)
    .filter((entry) => {
      const key = `${entry.slot_at}|${entry.opens_at ?? ''}|${entry.closes_at ?? ''}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort(compareTimeslotConfig);
}

function hasCompleteWindow(slot: AttendanceTimeslotConfig): boolean {
  return Boolean(slot.opens_at && slot.closes_at);
}

function isWithinWindow(nowMs: number, slot: AttendanceTimeslotConfig): boolean {
  if (!hasCompleteWindow(slot)) {
    return false;
  }

  const opensAtMs = Date.parse(slot.opens_at!);
  const closesAtMs = Date.parse(slot.closes_at!);

  if (!Number.isFinite(opensAtMs) || !Number.isFinite(closesAtMs)) {
    return false;
  }

  return nowMs >= opensAtMs && nowMs <= closesAtMs;
}

export function resolveActiveTimeslot(
  nowIso: string,
  timeslots: AttendanceTimeslotConfig[],
): AttendanceTimeslotConfig | null {
  const nowMs = Date.parse(nowIso);

  if (!Number.isFinite(nowMs)) {
    return null;
  }

  return (
    normalizeAttendanceTimeslots(timeslots).find((slot) => isWithinWindow(nowMs, slot)) ?? null
  );
}

export function hasAnyActiveWindow(nowIso: string, timeslots: AttendanceTimeslotConfig[]): boolean {
  return resolveActiveTimeslot(nowIso, timeslots) !== null;
}

export function isAutoWindowModeEnabled(
  settings: Pick<AttendanceSettings, 'timeslot_enabled' | 'timeslots'>,
): boolean {
  if (!settings.timeslot_enabled) {
    return false;
  }

  return normalizeAttendanceTimeslots(settings.timeslots).some(hasCompleteWindow);
}
