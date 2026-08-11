export interface RegistrationAvailabilityEvent {
  registration_mode: 'open' | 'closed';
  registration_opens_at: string | null;
  registration_closes_at: string | null;
}

export function isRegistrationOpenNow(
  event: RegistrationAvailabilityEvent,
  nowMs: number = Date.now(),
): boolean {
  if (event.registration_mode !== 'open') {
    return false;
  }

  const opensAt = event.registration_opens_at ? Date.parse(event.registration_opens_at) : null;
  const closesAt = event.registration_closes_at ? Date.parse(event.registration_closes_at) : null;

  if (opensAt !== null && Number.isFinite(opensAt) && nowMs < opensAt) {
    return false;
  }

  if (closesAt !== null && Number.isFinite(closesAt) && nowMs >= closesAt) {
    return false;
  }

  return true;
}
