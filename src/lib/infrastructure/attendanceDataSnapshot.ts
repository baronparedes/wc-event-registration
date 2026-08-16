import type { AttendanceSettings, AttendeeSearchResult } from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import type { AdminEventField } from '@/lib/domain/event-fields';
import type { AdminEvent } from '@/lib/domain/events';

const DATABASE_NAME = 'wc-event-registration-offline';
const STORE_NAME = 'attendance-data-snapshots';
const DATABASE_VERSION = 1;
const SNAPSHOT_VERSION = 1;
const STORAGE_PREFIX = 'wc:offline:attendance-data:';
export const ATTENDANCE_DATA_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;

export type AttendanceDataSnapshot = {
  version: number;
  eventId: string;
  event: AdminEvent;
  settings: AttendanceSettings;
  attendanceFields: AttendanceField[];
  registrationFields: AdminEventField[];
  attendees: AttendeeSearchResult[];
  createdAt: number;
  expiresAt: number;
};

function getStorageKey(eventId: string): string {
  return `${STORAGE_PREFIX}${eventId}`;
}

function isUsableSnapshot(
  snapshot: AttendanceDataSnapshot | null,
): snapshot is AttendanceDataSnapshot {
  return Boolean(
    snapshot &&
    snapshot.version === SNAPSHOT_VERSION &&
    snapshot.eventId &&
    snapshot.createdAt > 0 &&
    snapshot.expiresAt > Date.now(),
  );
}

function getLocalSnapshot(eventId: string): AttendanceDataSnapshot | null {
  try {
    const raw = window.localStorage.getItem(getStorageKey(eventId));
    if (!raw) return null;

    const snapshot = JSON.parse(raw) as AttendanceDataSnapshot;
    return isUsableSnapshot(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
}

function setLocalSnapshot(snapshot: AttendanceDataSnapshot): void {
  window.localStorage.setItem(getStorageKey(snapshot.eventId), JSON.stringify(snapshot));
}

function deleteLocalSnapshot(eventId: string): void {
  window.localStorage.removeItem(getStorageKey(eventId));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'eventId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open offline storage.'));
  });
}

function canUseIndexedDb(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

export async function readAttendanceDataSnapshot(
  eventId: string,
): Promise<AttendanceDataSnapshot | null> {
  const localSnapshot = getLocalSnapshot(eventId);

  if (!canUseIndexedDb()) return localSnapshot;

  try {
    const database = await openDatabase();
    const snapshot = await new Promise<AttendanceDataSnapshot | null>((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME)
        .get(eventId);
      request.onsuccess = () =>
        resolve((request.result as AttendanceDataSnapshot | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    database.close();
    const indexedDbSnapshot = isUsableSnapshot(snapshot) ? snapshot : null;

    if (!localSnapshot) return indexedDbSnapshot;
    if (!indexedDbSnapshot) return localSnapshot;

    return indexedDbSnapshot.createdAt >= localSnapshot.createdAt
      ? indexedDbSnapshot
      : localSnapshot;
  } catch {
    return localSnapshot;
  }
}

export async function writeAttendanceDataSnapshot(
  input: Omit<AttendanceDataSnapshot, 'version' | 'createdAt' | 'expiresAt'>,
): Promise<AttendanceDataSnapshot> {
  const now = Date.now();
  const snapshot: AttendanceDataSnapshot = {
    ...input,
    version: SNAPSHOT_VERSION,
    createdAt: now,
    expiresAt: now + ATTENDANCE_DATA_SNAPSHOT_TTL_MS,
  };

  try {
    setLocalSnapshot(snapshot);
  } catch {
    // IndexedDB remains the durable store when localStorage is unavailable or full.
  }

  if (!canUseIndexedDb()) {
    return snapshot;
  }

  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
        .put(snapshot);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    database.close();
  } catch {
    // The localStorage copy remains available as a fallback.
  }

  return snapshot;
}

export async function clearAttendanceDataSnapshot(eventId: string): Promise<void> {
  deleteLocalSnapshot(eventId);
  if (!canUseIndexedDb()) return;

  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
        .delete(eventId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    database.close();
  } catch {
    // The local fallback was already cleared.
  }
}
