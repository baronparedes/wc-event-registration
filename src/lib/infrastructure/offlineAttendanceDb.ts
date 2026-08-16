import Dexie, { type Table } from 'dexie';

import type {
  AttendanceSettings,
  AttendeeSearchResult,
  CheckInAttendeeInput,
} from '@/lib/domain/attendance';
import type { AdminEvent } from '@/lib/domain/events';

const DATABASE_NAME = 'wc-event-registration-offline';
const DATABASE_VERSION = 1;
export const OFFLINE_ATTENDANCE_PREPARATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const OFFLINE_ATTENDANCE_POST_EVENT_GRACE_MS = 2 * 60 * 60 * 1000;
const OFFLINE_ATTENDANCE_PROJECTION_VERSION = 1;
const OFFLINE_ATTENDANCE_SENDING_TIMEOUT_MS = 60_000;

export type OfflineAttendanceOwner = {
  userId: string;
  role: string;
};

export type PreparedOfflineAttendanceEvent = {
  eventId: string;
  ownerUserId: string;
  ownerRole: string;
  event: AdminEvent;
  settings: AttendanceSettings;
  attendees: AttendeeSearchResult[];
  preparedAt: number;
  expiresAt: number;
  projectionVersion: number;
};

export type QueuedOfflineCheckInStatus = 'pending' | 'sending' | 'failed';

export type QueuedOfflineCheckIn = {
  id: string;
  eventId: string;
  ownerUserId: string;
  payload: CheckInAttendeeInput;
  registrationId: string;
  optimisticCheckedInAt: string;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  status: QueuedOfflineCheckInStatus;
  sendingAt: number | null;
  lastError: string | null;
};

export type PrepareOfflineAttendanceEventInput = {
  owner: OfflineAttendanceOwner;
  event: AdminEvent;
  settings: AttendanceSettings;
  attendees: AttendeeSearchResult[];
  now?: number;
};

class OfflineAttendanceDatabase extends Dexie {
  preparedEvents!: Table<PreparedOfflineAttendanceEvent, string>;
  checkInOutbox!: Table<QueuedOfflineCheckIn, string>;

  constructor() {
    super(DATABASE_NAME);

    this.version(DATABASE_VERSION).stores({
      preparedEvents: '&eventId, ownerUserId, expiresAt, preparedAt',
      checkInOutbox:
        '&id, eventId, ownerUserId, [eventId+ownerUserId], status, nextAttemptAt, createdAt',
    });
  }
}

export const offlineAttendanceDb = new OfflineAttendanceDatabase();

export async function readPreparedOfflineAttendanceEvent(
  eventId: string,
  owner: OfflineAttendanceOwner,
  now = Date.now(),
): Promise<PreparedOfflineAttendanceEvent | null> {
  const preparedEvent = await offlineAttendanceDb.preparedEvents.get(eventId);

  if (
    !preparedEvent ||
    preparedEvent.ownerUserId !== owner.userId ||
    preparedEvent.ownerRole !== owner.role ||
    preparedEvent.expiresAt <= now
  ) {
    return null;
  }

  return preparedEvent;
}

export async function readPreparedOfflineAttendanceEventForUser(
  eventId: string,
  userId: string,
  now = Date.now(),
): Promise<PreparedOfflineAttendanceEvent | null> {
  const preparedEvent = await offlineAttendanceDb.preparedEvents.get(eventId);

  if (!preparedEvent || preparedEvent.ownerUserId !== userId || preparedEvent.expiresAt <= now) {
    return null;
  }

  return preparedEvent;
}

export async function writePreparedOfflineAttendanceEvent(
  preparedEvent: PreparedOfflineAttendanceEvent,
): Promise<void> {
  await offlineAttendanceDb.transaction('rw', offlineAttendanceDb.preparedEvents, async () => {
    await offlineAttendanceDb.preparedEvents.put(preparedEvent);
  });
}

export async function prepareOfflineAttendanceEvent({
  owner,
  event,
  settings,
  attendees,
  now = Date.now(),
}: PrepareOfflineAttendanceEventInput): Promise<PreparedOfflineAttendanceEvent> {
  if (!owner.userId || !owner.role) {
    throw new Error(
      'An authenticated kiosk or admin user is required to prepare offline check-in.',
    );
  }

  if (!settings.attendance_enabled) {
    throw new Error('Attendance tracking must be enabled before preparing offline check-in.');
  }

  if (event.id !== settings.event_id) {
    throw new Error('Attendance settings do not belong to this event.');
  }

  const eventEndsAt = event.ends_at ? Date.parse(event.ends_at) : Number.NaN;
  if (!Number.isFinite(eventEndsAt) || eventEndsAt <= now) {
    throw new Error('A future event end time is required to prepare offline check-in.');
  }

  const preparedEvent: PreparedOfflineAttendanceEvent = {
    eventId: event.id,
    ownerUserId: owner.userId,
    ownerRole: owner.role,
    event,
    settings,
    attendees,
    preparedAt: now,
    expiresAt: Math.min(
      eventEndsAt + OFFLINE_ATTENDANCE_POST_EVENT_GRACE_MS,
      now + OFFLINE_ATTENDANCE_PREPARATION_MAX_AGE_MS,
    ),
    projectionVersion: OFFLINE_ATTENDANCE_PROJECTION_VERSION,
  };

  const retainedPreparedEvent = await offlineAttendanceDb.transaction(
    'rw',
    offlineAttendanceDb.preparedEvents,
    offlineAttendanceDb.checkInOutbox,
    async () => {
      const pendingCheckIns = await offlineAttendanceDb.checkInOutbox
        .where('eventId')
        .equals(event.id)
        .count();

      if (pendingCheckIns > 0) {
        const existingPreparedEvent = await offlineAttendanceDb.preparedEvents.get(event.id);
        if (
          existingPreparedEvent &&
          existingPreparedEvent.ownerUserId === owner.userId &&
          existingPreparedEvent.ownerRole === owner.role
        ) {
          return existingPreparedEvent;
        }

        throw new Error('Sync queued check-ins before preparing this event again.');
      }

      await offlineAttendanceDb.preparedEvents.put(preparedEvent);
      return null;
    },
  );

  return retainedPreparedEvent ?? preparedEvent;
}

export async function enqueueOfflineCheckIn(
  item: QueuedOfflineCheckIn,
  attendees: AttendeeSearchResult[],
): Promise<void> {
  await offlineAttendanceDb.transaction(
    'rw',
    offlineAttendanceDb.preparedEvents,
    offlineAttendanceDb.checkInOutbox,
    async () => {
      const preparedEvent = await offlineAttendanceDb.preparedEvents.get(item.eventId);

      if (!preparedEvent || preparedEvent.ownerUserId !== item.ownerUserId) {
        throw new Error('This event is not prepared for offline check-in.');
      }

      await offlineAttendanceDb.preparedEvents.update(item.eventId, { attendees });
      await offlineAttendanceDb.checkInOutbox.put(item);
    },
  );
}

export async function listOfflineCheckIns(
  eventId: string,
  ownerUserId: string,
): Promise<QueuedOfflineCheckIn[]> {
  return offlineAttendanceDb.checkInOutbox
    .where('[eventId+ownerUserId]')
    .equals([eventId, ownerUserId])
    .sortBy('createdAt');
}

export async function claimNextOfflineCheckIn(
  eventId: string,
  owner: OfflineAttendanceOwner,
  now = Date.now(),
): Promise<QueuedOfflineCheckIn | null> {
  return offlineAttendanceDb.transaction(
    'rw',
    offlineAttendanceDb.preparedEvents,
    offlineAttendanceDb.checkInOutbox,
    async () => {
      const preparedEvent = await readPreparedOfflineAttendanceEvent(eventId, owner, now);
      if (!preparedEvent) {
        return null;
      }

      const queue = await listOfflineCheckIns(eventId, owner.userId);
      const nextItem = queue
        .filter(
          (item) =>
            (item.status === 'pending' && item.nextAttemptAt <= now) ||
            (item.status === 'sending' &&
              (item.sendingAt ?? item.createdAt) + OFFLINE_ATTENDANCE_SENDING_TIMEOUT_MS <= now),
        )
        .sort((a, b) => a.nextAttemptAt - b.nextAttemptAt || a.createdAt - b.createdAt)[0];

      if (!nextItem) {
        return null;
      }

      const claimedItem: QueuedOfflineCheckIn = {
        ...nextItem,
        status: 'sending',
        sendingAt: now,
        attempts: nextItem.attempts + 1,
        lastError: null,
      };
      await offlineAttendanceDb.checkInOutbox.put(claimedItem);

      return claimedItem;
    },
  );
}

export async function markOfflineCheckInForRetry(
  item: QueuedOfflineCheckIn,
  nextAttemptAt: number,
  error: string,
): Promise<void> {
  await offlineAttendanceDb.checkInOutbox.update(item.id, {
    status: 'pending',
    sendingAt: null,
    nextAttemptAt,
    lastError: error,
  });
}

export async function markOfflineCheckInFailed(
  item: QueuedOfflineCheckIn,
  error: string,
): Promise<void> {
  await offlineAttendanceDb.checkInOutbox.update(item.id, {
    status: 'failed',
    sendingAt: null,
    nextAttemptAt: Number.POSITIVE_INFINITY,
    lastError: error,
  });
}

export async function acknowledgeOfflineCheckIn(
  item: QueuedOfflineCheckIn,
  owner: OfflineAttendanceOwner,
  attendees: AttendeeSearchResult[],
): Promise<void> {
  await offlineAttendanceDb.transaction(
    'rw',
    offlineAttendanceDb.preparedEvents,
    offlineAttendanceDb.checkInOutbox,
    async () => {
      const preparedEvent = await readPreparedOfflineAttendanceEvent(item.eventId, owner);
      const queuedItem = await offlineAttendanceDb.checkInOutbox.get(item.id);

      if (!preparedEvent || !queuedItem || queuedItem.ownerUserId !== owner.userId) {
        throw new Error('This check-in is no longer available for offline sync.');
      }

      await offlineAttendanceDb.preparedEvents.update(item.eventId, { attendees });
      await offlineAttendanceDb.checkInOutbox.delete(item.id);
    },
  );
}

export async function clearOfflineAttendanceData(): Promise<void> {
  await offlineAttendanceDb.transaction(
    'rw',
    offlineAttendanceDb.preparedEvents,
    offlineAttendanceDb.checkInOutbox,
    async () => {
      await offlineAttendanceDb.preparedEvents.clear();
      await offlineAttendanceDb.checkInOutbox.clear();
    },
  );
}

export async function pruneExpiredOfflineAttendanceData(now = Date.now()): Promise<void> {
  const expiredEventIds = await offlineAttendanceDb.preparedEvents
    .where('expiresAt')
    .belowOrEqual(now)
    .primaryKeys();

  if (expiredEventIds.length === 0) {
    return;
  }

  await offlineAttendanceDb.transaction(
    'rw',
    offlineAttendanceDb.preparedEvents,
    offlineAttendanceDb.checkInOutbox,
    async () => {
      await offlineAttendanceDb.preparedEvents.bulkDelete(expiredEventIds);
      await offlineAttendanceDb.checkInOutbox.where('eventId').anyOf(expiredEventIds).delete();
    },
  );
}
