import { beforeEach, describe, expect, it } from 'vitest';

import type { AdminEvent } from '@/lib/domain/events';
import {
  clearAttendanceDataSnapshot,
  readAttendanceDataSnapshot,
  writeAttendanceDataSnapshot,
} from '../attendanceDataSnapshot';

const sampleEvent: AdminEvent = {
  id: 'e1',
  title: 'Test Event',
  slug: 'test-event',
  event_date: '2025-01-01',
  event_start_time: '10:00',
  event_end_time: '12:00',
  location: 'Hall',
  description: 'Desc',
  status: 'published',
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
};

const sampleInput = {
  eventId: 'e1',
  event: sampleEvent,
  settings: {
    event_id: 'e1',
    is_offline_check_in_enabled: true,
    is_offline_attendance_enabled: true,
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
});
