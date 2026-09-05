import { tryConvertRfidInput } from '@/lib/domain/attendance';

/**
 * Checks if exactly one result has a member ID that matches the direct scan or its
 * canonical Pass 2 RFID conversion.
 *
 * Used for auto-confirm flow when RFID or member ID is scanned directly.
 *
 * @param searchToken The raw scanned or entered token
 * @param results Search results with member_id
 * @returns true if exactly one result matches the token
 */
export function isDirectMemberIdMatch(
  searchToken: string,
  results: Array<{ member_id: string | null }>,
): boolean {
  if (results.length !== 1) return false;

  const normalized = searchToken.trim().toLowerCase();
  const converted = tryConvertRfidInput(searchToken).trim().toLowerCase();
  const resultMemberId = (results[0].member_id ?? '').toLowerCase();

  return (
    resultMemberId.length > 0 && (normalized === resultMemberId || converted === resultMemberId)
  );
}

/**
 * Checks if registration is currently open based on mode and time windows.
 *
 * @param event Event with registration_mode, registration_opens_at, registration_closes_at, and nowMs
 * @returns true if registration is open right now
 */
export function isRegistrationOpenNow(event: {
  registration_mode: 'open' | 'closed';
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  nowMs: number;
}): boolean {
  if (event.registration_mode !== 'open') {
    return false;
  }

  const now = event.nowMs;
  const opensAt = event.registration_opens_at ? Date.parse(event.registration_opens_at) : null;
  const closesAt = event.registration_closes_at ? Date.parse(event.registration_closes_at) : null;

  if (opensAt !== null && Number.isFinite(opensAt) && now < opensAt) {
    return false;
  }

  if (closesAt !== null && Number.isFinite(closesAt) && now >= closesAt) {
    return false;
  }

  return true;
}

/**
 * Checks if a given timestamp falls within the event's start and end window.
 *
 * @param event Event with starts_at and ends_at ISO timestamps
 * @param nowMs Current time in milliseconds
 * @returns true if nowMs is within the event window
 */
export function isWithinEventWindow(
  event: { starts_at: string | null; ends_at: string | null },
  nowMs: number,
): boolean {
  const startMs = event.starts_at ? Date.parse(event.starts_at) : Number.NaN;
  const endMs = event.ends_at ? Date.parse(event.ends_at) : Number.NaN;

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return false;
  }

  return nowMs >= startMs && nowMs <= endMs;
}
