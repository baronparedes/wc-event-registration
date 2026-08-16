import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AttendeeSearchResult } from '@/lib/domain/attendance';
import type { AdminEvent } from '@/lib/domain/events';

import {
  OFFLINE_ATTENDANCE_POST_EVENT_GRACE_MS,
  type PreparedOfflineAttendanceEvent,
  type QueuedOfflineCheckIn,
  acknowledgeOfflineCheckIn,
  claimNextOfflineCheckIn,
  enqueueOfflineCheckIn,
  listOfflineCheckIns,
  markOfflineCheckInForRetry,
  offlineAttendanceDb,
  prepareOfflineAttendanceEvent,
  pruneExpiredOfflineAttendanceData,
  readPreparedOfflineAttendanceEvent,
  readPreparedOfflineAttendanceEventForUser,
  writePreparedOfflineAttendanceEvent,
} from '../offlineAttendanceDb';

const owner = { userId: 'user-1', role: 'kiosk' };

function createEvent(): AdminEvent {
  return {
    id: 'event-1',
    slug: 'event-1',
    title: 'Event One',
    description: null,
    location: null,
    starts_at: '2026-08-16T01:00:00.000Z',
    ends_at: '2026-08-16T03:00:00.000Z',
    registration_opens_at: null,
    registration_closes_at: null,
    status: 'published',
    duplicate_policy: 'block',
    require_id_lookup: true,
    registration_mode: 'closed',
    allow_public_registrations: false,
    metadata: {},
    created_by_admin_id: 'admin-1',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  };
}

function createAttendee(checkInStatus: AttendeeSearchResult['check_in_status'] = 'not_checked_in') {
  return {
    attendee_kind: 'registered',
    registration_id: 'registration-1',
    public_registration_id: null,
    user_id: 'member-1',
    member_id: 'MEMBER-1',
    nickname: 'Ada',
    last_name: 'Lovelace',
    full_name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: null,
    category: null,
    registration_status: 'submitted',
    submitted_at: '2026-08-01T00:00:00.000Z',
    check_in_status: checkInStatus,
    official_check_in_time: null,
    registration_answers: [],
    attendance_answers: [],
  } satisfies AttendeeSearchResult;
}

function createPreparedEvent(expiresAt = Date.now() + 60_000): PreparedOfflineAttendanceEvent {
  return {
    eventId: 'event-1',
    ownerUserId: owner.userId,
    ownerRole: owner.role,
    event: createEvent(),
    settings: {
      event_id: 'event-1',
      attendance_enabled: true,
      timeslot_enabled: false,
      enforce_check_in_event_window: true,
      timeslots: [],
      updated_at: '2026-08-01T00:00:00.000Z',
    },
    attendees: [createAttendee()],
    preparedAt: Date.now(),
    expiresAt,
    projectionVersion: 1,
  };
}

function createQueuedCheckIn(): QueuedOfflineCheckIn {
  return {
    id: 'operation-1',
    eventId: 'event-1',
    ownerUserId: owner.userId,
    payload: {
      event_id: 'event-1',
      attendee_kind: 'registered',
      registration_id: 'registration-1',
    },
    registrationId: 'registration-1',
    optimisticCheckedInAt: '2026-08-16T01:30:00.000Z',
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: Date.now(),
    status: 'pending',
    sendingAt: null,
    lastError: null,
  };
}

describe('offlineAttendanceDb', () => {
  beforeEach(async () => {
    await offlineAttendanceDb.delete();
    await offlineAttendanceDb.open();
  });

  afterEach(async () => {
    await offlineAttendanceDb.delete();
  });

  it('returns a prepared event only to its matching owner before expiry', async () => {
    const preparedEvent = createPreparedEvent(2_000);
    await writePreparedOfflineAttendanceEvent(preparedEvent);

    await expect(readPreparedOfflineAttendanceEvent('event-1', owner, 1_000)).resolves.toEqual(
      preparedEvent,
    );
    await expect(
      readPreparedOfflineAttendanceEvent('event-1', { userId: 'user-2', role: 'kiosk' }, 1_000),
    ).resolves.toBeNull();
    await expect(readPreparedOfflineAttendanceEvent('event-1', owner, 2_000)).resolves.toBeNull();
  });

  it('returns a prepared event to its persisted session user without an online role lookup', async () => {
    const preparedEvent = createPreparedEvent(2_000);
    await writePreparedOfflineAttendanceEvent(preparedEvent);

    await expect(
      readPreparedOfflineAttendanceEventForUser('event-1', 'user-1', 1_000),
    ).resolves.toEqual(preparedEvent);
    await expect(
      readPreparedOfflineAttendanceEventForUser('event-1', 'user-2', 1_000),
    ).resolves.toBeNull();
  });

  it('atomically persists an optimistic attendee update and its queued check-in', async () => {
    await writePreparedOfflineAttendanceEvent(createPreparedEvent());
    const queuedCheckIn = createQueuedCheckIn();
    const updatedAttendees = [
      {
        ...createAttendee('checked_in'),
        official_check_in_time: queuedCheckIn.optimisticCheckedInAt,
      },
    ];

    await enqueueOfflineCheckIn(queuedCheckIn, updatedAttendees);

    await expect(readPreparedOfflineAttendanceEvent('event-1', owner)).resolves.toMatchObject({
      attendees: updatedAttendees,
    });
    await expect(listOfflineCheckIns('event-1', owner.userId)).resolves.toEqual([queuedCheckIn]);
  });

  it('prepares an attendance-enabled event with bounded post-event retention', async () => {
    const now = Date.parse('2026-08-16T00:00:00.000Z');
    const event = createEvent();
    event.ends_at = '2026-08-16T03:00:00.000Z';

    const preparedEvent = await prepareOfflineAttendanceEvent({
      owner,
      event,
      settings: createPreparedEvent().settings,
      attendees: [createAttendee()],
      now,
    });

    expect(preparedEvent.expiresAt).toBe(
      Date.parse(event.ends_at) + OFFLINE_ATTENDANCE_POST_EVENT_GRACE_MS,
    );
    await expect(readPreparedOfflineAttendanceEvent(event.id, owner, now)).resolves.toEqual(
      preparedEvent,
    );
  });

  it('retains a prepared event with queued check-ins', async () => {
    const existingPreparedEvent = createPreparedEvent();
    await writePreparedOfflineAttendanceEvent(existingPreparedEvent);
    await enqueueOfflineCheckIn(createQueuedCheckIn(), [createAttendee('checked_in')]);

    await expect(
      prepareOfflineAttendanceEvent({
        owner,
        event: createEvent(),
        settings: createPreparedEvent().settings,
        attendees: [],
        now: Date.parse('2026-08-16T00:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      ...existingPreparedEvent,
      attendees: [createAttendee('checked_in')],
    });
  });

  it('claims a due check-in and recovers a stalled sending item', async () => {
    const queuedCheckIn = createQueuedCheckIn();
    queuedCheckIn.nextAttemptAt = 1_000;
    await writePreparedOfflineAttendanceEvent(createPreparedEvent());
    await enqueueOfflineCheckIn(queuedCheckIn, [createAttendee('checked_in')]);

    const firstClaim = await claimNextOfflineCheckIn('event-1', owner, 1_000);
    expect(firstClaim).toMatchObject({
      id: queuedCheckIn.id,
      status: 'sending',
      sendingAt: 1_000,
      attempts: 1,
    });

    const recoveredClaim = await claimNextOfflineCheckIn('event-1', owner, 61_000);
    expect(recoveredClaim).toMatchObject({
      id: queuedCheckIn.id,
      status: 'sending',
      sendingAt: 61_000,
      attempts: 2,
    });
  });

  it('acknowledges a queued check-in with the server-authoritative attendee state', async () => {
    const queuedCheckIn = createQueuedCheckIn();
    await writePreparedOfflineAttendanceEvent(createPreparedEvent());
    await enqueueOfflineCheckIn(queuedCheckIn, [createAttendee('checked_in')]);
    const serverAttendees = [
      {
        ...createAttendee('checked_in'),
        official_check_in_time: '2026-08-16T01:31:00.000Z',
      },
    ];

    await acknowledgeOfflineCheckIn(queuedCheckIn, owner, serverAttendees);

    await expect(listOfflineCheckIns('event-1', owner.userId)).resolves.toEqual([]);
    await expect(readPreparedOfflineAttendanceEvent('event-1', owner)).resolves.toMatchObject({
      attendees: serverAttendees,
    });
  });

  it('returns failed deliveries to pending retry state', async () => {
    const queuedCheckIn = createQueuedCheckIn();
    await writePreparedOfflineAttendanceEvent(createPreparedEvent());
    await enqueueOfflineCheckIn(queuedCheckIn, [createAttendee('checked_in')]);

    await markOfflineCheckInForRetry(queuedCheckIn, 5_000, 'Network unavailable');

    await expect(listOfflineCheckIns('event-1', owner.userId)).resolves.toEqual([
      {
        ...queuedCheckIn,
        nextAttemptAt: 5_000,
        lastError: 'Network unavailable',
      },
    ]);
  });

  it('removes expired prepared data and its pending writes', async () => {
    await writePreparedOfflineAttendanceEvent(createPreparedEvent(1_000));
    await enqueueOfflineCheckIn(createQueuedCheckIn(), [createAttendee('checked_in')]);

    await pruneExpiredOfflineAttendanceData(1_000);

    await expect(readPreparedOfflineAttendanceEvent('event-1', owner, 1_000)).resolves.toBeNull();
    await expect(listOfflineCheckIns('event-1', owner.userId)).resolves.toEqual([]);
  });
});
