import type { AttendanceTimeslotConfig } from '@/lib/domain/attendance';

/**
 * Resolves the suggested check-in timeslot based on availability and mode.
 *
 * In auto-window mode, returns the active timeslot if available.
 * Otherwise, returns the latest past/current slot, or the first future slot.
 *
 * @param config Configuration object with timeslot settings and current time
 * @returns The suggested slot ISO string, or empty string if no slots available
 */
export function resolveSuggestedTimeslot(config: {
  timeslotEnabled: boolean;
  timeslots: AttendanceTimeslotConfig[];
  autoWindowModeEnabled: boolean;
  activeTimeslot: { slot_at: string } | null;
  nowMs: number;
}): string {
  if (!config.timeslotEnabled || config.timeslots.length === 0) {
    return '';
  }

  if (config.autoWindowModeEnabled) {
    return config.activeTimeslot?.slot_at ?? '';
  }

  const validSlots = config.timeslots
    .map((slot) => ({ slot: slot.slot_at, time: Date.parse(slot.slot_at) }))
    .filter((entry) => Number.isFinite(entry.time))
    .sort((a, b) => a.time - b.time);

  if (validSlots.length === 0) {
    return config.timeslots[0]?.slot_at ?? '';
  }

  const latestPastOrCurrent = [...validSlots].reverse().find((entry) => entry.time <= config.nowMs);
  if (latestPastOrCurrent) {
    return latestPastOrCurrent.slot;
  }

  return validSlots[0].slot;
}
