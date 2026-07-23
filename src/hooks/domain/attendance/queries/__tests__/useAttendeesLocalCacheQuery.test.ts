import { describe, expect, it } from 'vitest';

import { applyCheckInPatchToAttendees } from '@/hooks/domain/attendance/queries/useAttendeesLocalCacheQuery';
import type { AttendeeSearchResult } from '@/lib/domain/attendance';

function buildAttendee(overrides: Partial<AttendeeSearchResult>): AttendeeSearchResult {
  return {
    attendee_kind: 'registered',
    registration_id: 'registration-1',
    public_registration_id: null,
    user_id: 'user-1',
    member_id: 'WC-001',
    nickname: 'Test',
    last_name: 'Person',
    full_name: 'Test Person',
    email: 'test@example.com',
    role: null,
    category: null,
    registration_status: 'submitted',
    submitted_at: '2026-07-20T00:00:00.000Z',
    check_in_status: 'not_checked_in',
    official_check_in_time: null,
    registration_answers: [],
    attendance_answers: [],
    ...overrides,
  };
}

describe('applyCheckInPatchToAttendees', () => {
  it('marks a registered attendee as checked in when registration id matches', () => {
    const attendees: AttendeeSearchResult[] = [buildAttendee({ registration_id: 'reg-123' })];

    const result = applyCheckInPatchToAttendees(attendees, {
      id: 'reg-123',
      kind: 'registered',
      checkedInAt: '2026-07-21T01:00:00.000Z',
      registrationId: 'reg-123',
      publicRegistrationId: null,
    });

    expect(result.didUpdate).toBe(true);
    expect(result.attendees[0].check_in_status).toBe('checked_in');
    expect(result.attendees[0].official_check_in_time).toBe('2026-07-21T01:00:00.000Z');
  });

  it('marks a public attendee as checked in when public registration id matches', () => {
    const attendees: AttendeeSearchResult[] = [
      buildAttendee({
        attendee_kind: 'public',
        registration_id: 'public-reg-1',
        public_registration_id: 'public-reg-1',
        user_id: null,
        member_id: 'Guest',
      }),
    ];

    const result = applyCheckInPatchToAttendees(attendees, {
      id: 'public-reg-1',
      kind: 'public',
      checkedInAt: '2026-07-21T01:10:00.000Z',
      registrationId: null,
      publicRegistrationId: 'public-reg-1',
    });

    expect(result.didUpdate).toBe(true);
    expect(result.attendees[0].check_in_status).toBe('checked_in');
    expect(result.attendees[0].official_check_in_time).toBe('2026-07-21T01:10:00.000Z');
  });

  it('uses the earliest check-in time when attendee already has a prior official time', () => {
    const attendees: AttendeeSearchResult[] = [
      buildAttendee({
        registration_id: 'reg-1',
        check_in_status: 'checked_in',
        official_check_in_time: '2026-07-21T01:00:00.000Z',
      }),
    ];

    const result = applyCheckInPatchToAttendees(attendees, {
      id: 'reg-1',
      kind: 'registered',
      checkedInAt: '2026-07-21T01:30:00.000Z',
      registrationId: 'reg-1',
      publicRegistrationId: null,
    });

    expect(result.didUpdate).toBe(false);
    expect(result.attendees[0].official_check_in_time).toBe('2026-07-21T01:00:00.000Z');
  });

  it('returns unchanged attendees when no match is found', () => {
    const attendees: AttendeeSearchResult[] = [buildAttendee({ registration_id: 'reg-1' })];

    const result = applyCheckInPatchToAttendees(attendees, {
      id: 'reg-2',
      kind: 'registered',
      checkedInAt: '2026-07-21T01:00:00.000Z',
      registrationId: 'reg-2',
      publicRegistrationId: null,
    });

    expect(result.didUpdate).toBe(false);
    expect(result.attendees).toEqual(attendees);
  });
});
