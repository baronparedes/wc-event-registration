import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminEvent } from '@/lib/domain/events';
import { useOfflineAttendanceDataSnapshot } from '../useOfflineAttendanceDataSnapshot';

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

describe('useOfflineAttendanceDataSnapshot', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('reads stored snapshot and updates snapshot on live data change', async () => {
    const { result } = renderHook(() =>
      useOfflineAttendanceDataSnapshot({
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
      }),
    );

    await waitFor(() => {
      expect(result.current.isSnapshotAvailable).toBe(true);
      expect(result.current.isUsingSnapshot).toBe(false);
      expect(result.current.event).toEqual(sampleEvent);
    });
  });

  it('uses snapshot when live source is incomplete or offline', async () => {
    localStorage.setItem(
      'wc:offline:attendance-data:e1',
      JSON.stringify({
        version: 1,
        eventId: 'e1',
        event: sampleEvent,
        settings: { event_id: 'e1' },
        attendanceFields: [],
        registrationFields: [],
        attendees: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 100000,
      }),
    );

    const { result } = renderHook(() =>
      useOfflineAttendanceDataSnapshot({
        eventId: 'e1',
        event: undefined,
        settings: undefined,
        attendanceFields: undefined,
        registrationFields: undefined,
        attendees: null,
      }),
    );

    await waitFor(() => {
      expect(result.current.isUsingSnapshot).toBe(true);
      expect(result.current.event).toEqual(sampleEvent);
    });
  });

  it('handles empty eventId without reading or writing snapshot', () => {
    const { result } = renderHook(() =>
      useOfflineAttendanceDataSnapshot({
        eventId: undefined,
        event: undefined,
        settings: undefined,
        attendanceFields: undefined,
        registrationFields: undefined,
        attendees: null,
      }),
    );

    expect(result.current.isSnapshotAvailable).toBe(false);
    expect(result.current.event).toBeUndefined();
  });
});
