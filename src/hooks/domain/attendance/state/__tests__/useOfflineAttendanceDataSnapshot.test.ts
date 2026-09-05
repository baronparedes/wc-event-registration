import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminEvent } from '@/lib/domain/events';

import { useOfflineAttendanceDataSnapshot } from '../useOfflineAttendanceDataSnapshot';

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
          attendance_enabled: true,
          timeslot_enabled: false,
          enforce_check_in_event_window: false,
          timeslots: [],
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
