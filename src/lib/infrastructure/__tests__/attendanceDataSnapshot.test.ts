import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminEvent } from '@/lib/domain/events';

import {
  type AttendanceDataSnapshot,
  clearAttendanceDataSnapshot,
  readAttendanceDataSnapshot,
  writeAttendanceDataSnapshot,
} from '../attendanceDataSnapshot';

const sampleEvent: AdminEvent = {
  id: 'e1',
  title: 'Test Event',
  slug: 'test-event',
  description: 'Desc',
  location: 'Hall',
  starts_at: '2025-01-01T10:00:00Z',
  ends_at: '2025-01-01T12:00:00Z',
  registration_opens_at: null,
  registration_closes_at: null,
  status: 'published',
  duplicate_policy: 'block',
  require_id_lookup: true,
  registration_mode: 'open',
  allow_public_registrations: false,
  metadata: {},
  created_by_admin_id: null,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
};

const sampleInput = {
  eventId: 'e1',
  event: sampleEvent,
  settings: {
    event_id: 'e1',
    attendance_enabled: true,
    timeslot_enabled: false,
    enforce_check_in_event_window: false,
    timeslots: [],
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  },
  attendanceFields: [],
  registrationFields: [],
  attendees: [],
};

describe('attendanceDataSnapshot', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes and reads snapshot from local storage and handles clearing', async () => {
    const written = await writeAttendanceDataSnapshot(sampleInput);
    expect(written.eventId).toBe('e1');

    const read = await readAttendanceDataSnapshot('e1');
    expect(read).not.toBeNull();
    expect(read?.eventId).toBe('e1');

    await clearAttendanceDataSnapshot('e1');
    const readAfterClear = await readAttendanceDataSnapshot('e1');
    expect(readAfterClear).toBeNull();
  });

  it('returns null for non-existent or invalid or expired snapshot', async () => {
    expect(await readAttendanceDataSnapshot('nonexistent')).toBeNull();

    localStorage.setItem(
      'wc:offline:attendance-data:e1',
      JSON.stringify({
        version: 1,
        eventId: 'e1',
        createdAt: Date.now() - 10000,
        expiresAt: Date.now() - 1000, // expired
      }),
    );

    expect(await readAttendanceDataSnapshot('e1')).toBeNull();

    localStorage.setItem('wc:offline:attendance-data:e1', 'invalid json{');
    expect(await readAttendanceDataSnapshot('e1')).toBeNull();
  });

  it('uses the local copy when IndexedDB cannot be opened', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new Error('IndexedDB unavailable');
      },
    });

    const written = await writeAttendanceDataSnapshot(sampleInput);
    expect(await readAttendanceDataSnapshot('e1')).toEqual(written);

    await clearAttendanceDataSnapshot('e1');
    expect(localStorage.getItem('wc:offline:attendance-data:e1')).toBeNull();
  });

  it('writes to IndexedDB, reads the newest copy and clears both stores', async () => {
    const snapshots = new Map<string, AttendanceDataSnapshot>();
    const makeRequest = (result: unknown) => {
      const request = { result, onsuccess: null as (() => void) | null, onerror: null };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    };
    const database = {
      objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
      createObjectStore: vi.fn(),
      close: vi.fn(),
      transaction: vi.fn(() => ({
        objectStore: () => ({
          get: (eventId: string) => makeRequest(snapshots.get(eventId)),
          put: (snapshot: AttendanceDataSnapshot) => {
            snapshots.set(snapshot.eventId, snapshot);
            return makeRequest(undefined);
          },
          delete: (eventId: string) => {
            snapshots.delete(eventId);
            return makeRequest(undefined);
          },
        }),
      })),
    };
    vi.stubGlobal('indexedDB', {
      open: vi.fn(() => {
        const request = {
          result: database,
          onupgradeneeded: null as (() => void) | null,
          onsuccess: null as (() => void) | null,
          onerror: null,
        };
        queueMicrotask(() => {
          request.onupgradeneeded?.();
          request.onsuccess?.();
        });
        return request;
      }),
    });

    const written = await writeAttendanceDataSnapshot(sampleInput);
    expect(snapshots.get('e1')).toEqual(written);
    expect(database.createObjectStore).toHaveBeenCalledWith('attendance-data-snapshots', {
      keyPath: 'eventId',
    });

    const newerIndexedCopy = { ...written, createdAt: written.createdAt + 1 };
    snapshots.set('e1', newerIndexedCopy);
    expect(await readAttendanceDataSnapshot('e1')).toEqual(newerIndexedCopy);

    snapshots.set('e1', { ...written, createdAt: written.createdAt - 1 });
    expect(await readAttendanceDataSnapshot('e1')).toEqual(written);

    await clearAttendanceDataSnapshot('e1');
    expect(snapshots.has('e1')).toBe(false);
    expect(localStorage.getItem('wc:offline:attendance-data:e1')).toBeNull();
    expect(database.close).toHaveBeenCalled();
  });
});
