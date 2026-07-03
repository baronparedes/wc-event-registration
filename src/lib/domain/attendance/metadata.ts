import type { AttendeeKind, CheckInStatus } from './types';

export const ATTENDEE_KINDS: AttendeeKind[] = ['registered', 'walk_in'];

export const CHECK_IN_STATUSES: CheckInStatus[] = ['checked_in', 'already_checked_in', 'rejected'];

export const CHECK_IN_STATUS_LABELS: Record<CheckInStatus, string> = {
  checked_in: 'Checked In',
  already_checked_in: 'Already Checked In',
  rejected: 'Rejected',
};
