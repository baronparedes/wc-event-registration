import { useEffect } from 'react';

import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

import type { AttendanceCheckInRealtimeEvent, AttendeeKind } from '@/lib/domain/attendance/types';
import { supabase } from '@/lib/infrastructure';

type AttendanceCheckInRow = {
  event_id?: unknown;
  attendee_kind?: unknown;
  registration_id?: unknown;
  public_registration_id?: unknown;
  first_checked_in_at?: unknown;
};

type UseAttendanceCheckInRealtimeOptions = {
  onCheckIn: (event: AttendanceCheckInRealtimeEvent) => void;
  enabled?: boolean;
};

function isAttendeeKind(value: unknown): value is AttendeeKind {
  return value === 'registered' || value === 'public';
}

function toCheckInEvent(
  payload: RealtimePostgresInsertPayload<AttendanceCheckInRow>,
): AttendanceCheckInRealtimeEvent | null {
  const row = payload.new;

  if (
    !row ||
    typeof row.event_id !== 'string' ||
    !isAttendeeKind(row.attendee_kind) ||
    typeof row.first_checked_in_at !== 'string'
  ) {
    return null;
  }

  const registrationId = typeof row.registration_id === 'string' ? row.registration_id : null;
  const publicRegistrationId =
    typeof row.public_registration_id === 'string' ? row.public_registration_id : null;

  return {
    event_id: row.event_id,
    attendee_kind: row.attendee_kind,
    registration_id: registrationId,
    public_registration_id: publicRegistrationId,
    first_checked_in_at: row.first_checked_in_at,
  };
}

/**
 * Subscribes to first-check-in insert events for a single event.
 * Consumers can patch in-memory/local caches immediately for cross-device freshness.
 */
export function useAttendanceCheckInRealtime(
  eventId: string | undefined,
  options: UseAttendanceCheckInRealtimeOptions,
) {
  const { onCheckIn, enabled = true } = options;

  useEffect(() => {
    if (!eventId || !enabled) {
      return;
    }

    const channel = supabase
      .channel(`attendance-check-ins:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_check_ins',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const parsed = toCheckInEvent(
            payload as RealtimePostgresInsertPayload<AttendanceCheckInRow>,
          );

          if (!parsed) return;

          onCheckIn(parsed);
        },
      )
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[attendance-check-ins] realtime subscription issue', {
            eventId,
            status,
            error,
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, eventId, onCheckIn]);
}
